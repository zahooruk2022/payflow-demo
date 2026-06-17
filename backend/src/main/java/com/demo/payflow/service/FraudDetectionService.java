package com.demo.payflow.service;

import com.demo.payflow.model.Transaction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FraudDetectionService {

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${payflow.fraud.high-amount-threshold}")
    private BigDecimal highAmountThreshold;

    @Value("${payflow.fraud.rapid-succession-window-seconds}")
    private long rapidWindowSeconds;

    @Value("${payflow.fraud.rapid-succession-count}")
    private long rapidCount;

    @Value("${payflow.fraud.round-number-threshold}")
    private BigDecimal roundNumberThreshold;

    @Value("${payflow.fraud.high-risk-threshold}")
    private int highRiskThreshold;

    public record FraudResult(int riskScore, List<String> reasons) {
        public boolean isHighRisk() { return riskScore >= 60; }
    }

    public FraudResult analyze(Transaction transaction) {
        int risk = 0;
        List<String> reasons = new ArrayList<>();

        // Rule 1: Large single payment
        if (transaction.getAmount().compareTo(highAmountThreshold) > 0) {
            risk += 60;
            reasons.add(String.format("Large transfer: $%,.2f exceeds $%,.0f threshold",
                    transaction.getAmount(), highAmountThreshold));
        }

        // Rule 2: Rapid succession (Redis sliding counter)
        String key = "rapid:" + transaction.getSenderAccount().getId();
        Long txCount = redisTemplate.opsForValue().increment(key);
        if (txCount != null && txCount == 1L) {
            redisTemplate.expire(key, Duration.ofSeconds(rapidWindowSeconds));
        }
        if (txCount != null && txCount >= rapidCount) {
            risk += 70;
            reasons.add(String.format("Rapid succession: %d transactions within %ds window", txCount, rapidWindowSeconds));
        }

        // Rule 3: Suspicious round number
        if (transaction.getAmount().compareTo(roundNumberThreshold) > 0 &&
                transaction.getAmount().stripTrailingZeros().scale() <= 0) {
            risk += 20;
            reasons.add("Suspicious round-number transfer");
        }

        int finalScore = Math.min(risk, 100);
        log.debug("Fraud check txn={} score={} reasons={}", transaction.getId(), finalScore, reasons);
        return new FraudResult(finalScore, reasons);
    }
}
