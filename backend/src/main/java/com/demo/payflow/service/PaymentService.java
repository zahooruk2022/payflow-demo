package com.demo.payflow.service;

import com.demo.payflow.dto.DashboardStats;
import com.demo.payflow.dto.PaymentRequest;
import com.demo.payflow.dto.TransactionEvent;
import com.demo.payflow.messaging.PaymentProducer;
import com.demo.payflow.model.*;
import com.demo.payflow.repository.AccountRepository;
import com.demo.payflow.repository.FraudAlertRepository;
import com.demo.payflow.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final FraudAlertRepository fraudAlertRepository;
    private final FraudDetectionService fraudDetectionService;
    private final PaymentMetricsService metrics;
    private final PaymentProducer paymentProducer;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Transaction submitPayment(PaymentRequest request) {
        Account sender = accountRepository.findById(request.senderAccountId())
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));
        Account receiver = accountRepository.findById(request.receiverAccountId())
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));

        if (sender.getId().equals(receiver.getId())) {
            throw new IllegalArgumentException("Cannot transfer to the same account");
        }

        Transaction txn = Transaction.builder()
                .id(UUID.randomUUID().toString())
                .senderAccount(sender)
                .receiverAccount(receiver)
                .amount(request.amount())
                .currency(request.currency() != null ? request.currency() : "GBP")
                .status(TransactionStatus.PENDING)
                .reference("TXN-" + System.currentTimeMillis())
                .description(request.description())
                .riskScore(0)
                .build();

        Transaction saved = transactionRepository.save(txn);
        metrics.recordSubmitted();
        broadcastTransaction(saved);
        paymentProducer.publishPayment(saved);

        log.info("Payment submitted: {}", saved.getReference());
        return saved;
    }

    @Transactional
    public void processPayment(String transactionId) {
        Transaction txn = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + transactionId));

        long startMs = System.currentTimeMillis();

        txn.setStatus(TransactionStatus.PROCESSING);
        transactionRepository.save(txn);
        broadcastTransaction(txn);

        try { Thread.sleep(600); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }

        FraudDetectionService.FraudResult fraud = fraudDetectionService.analyze(txn);
        txn.setRiskScore(fraud.riskScore());

        if (fraud.isHighRisk()) {
            txn.setStatus(TransactionStatus.FLAGGED);
            txn.setFraudReason(String.join("; ", fraud.reasons()));
            txn.setCompletedAt(LocalDateTime.now());
            transactionRepository.save(txn);

            FraudAlert alert = FraudAlert.builder()
                    .id(UUID.randomUUID().toString())
                    .transaction(txn)
                    .alertType(resolveAlertType(fraud.reasons()))
                    .description(txn.getFraudReason())
                    .riskScore(fraud.riskScore())
                    .build();
            fraudAlertRepository.save(alert);
            metrics.recordFlagged();
            messagingTemplate.convertAndSend("/topic/fraud-alerts", toEvent(txn));
            log.warn("FLAGGED txn={} risk={}", transactionId, fraud.riskScore());

        } else {
            txn.setStatus(TransactionStatus.COMPLETED);
            txn.setCompletedAt(LocalDateTime.now());

            Account sender = txn.getSenderAccount();
            Account receiver = txn.getReceiverAccount();
            sender.setBalance(sender.getBalance().subtract(txn.getAmount()));
            receiver.setBalance(receiver.getBalance().add(txn.getAmount()));
            accountRepository.save(sender);
            accountRepository.save(receiver);
            transactionRepository.save(txn);
            metrics.recordCompleted(txn.getAmount());
        }

        metrics.recordProcessingTime(System.currentTimeMillis() - startMs);
        broadcastTransaction(txn);
        messagingTemplate.convertAndSend("/topic/stats", getStats());
    }

    public List<Transaction> getRecentTransactions(int limit) {
        return transactionRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit));
    }

    public DashboardStats getStats() {
        long total     = transactionRepository.count();
        long completed = transactionRepository.countByStatus(TransactionStatus.COMPLETED);
        long pending   = transactionRepository.countByStatus(TransactionStatus.PENDING)
                       + transactionRepository.countByStatus(TransactionStatus.PROCESSING);
        long flagged   = transactionRepository.countByStatus(TransactionStatus.FLAGGED);
        BigDecimal volume = transactionRepository.sumCompletedAmount();

        double fraudRate   = total > 0 ? round((double) flagged   / total * 100) : 0;
        double successRate = total > 0 ? round((double) completed / total * 100) : 0;

        return new DashboardStats(total, completed, pending, flagged, volume, fraudRate, successRate);
    }

    private void broadcastTransaction(Transaction txn) {
        messagingTemplate.convertAndSend("/topic/transactions", toEvent(txn));
    }

    private TransactionEvent toEvent(Transaction t) {
        return new TransactionEvent(
                t.getId(),
                t.getSenderAccount().getName(),
                t.getSenderAccount().getAccountNumber(),
                t.getReceiverAccount().getName(),
                t.getReceiverAccount().getAccountNumber(),
                t.getAmount(),
                t.getCurrency(),
                t.getStatus(),
                t.getRiskScore(),
                t.getFraudReason(),
                t.getReference(),
                t.getCreatedAt() != null ? t.getCreatedAt() : LocalDateTime.now()
        );
    }

    private String resolveAlertType(List<String> reasons) {
        if (reasons.stream().anyMatch(r -> r.contains("Large"))) return "HIGH_AMOUNT";
        if (reasons.stream().anyMatch(r -> r.contains("Rapid"))) return "RAPID_SUCCESSION";
        return "SUSPICIOUS_PATTERN";
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
