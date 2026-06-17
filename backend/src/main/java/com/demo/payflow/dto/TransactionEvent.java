package com.demo.payflow.dto;

import com.demo.payflow.model.TransactionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionEvent(
    String id,
    String senderName,
    String senderAccountNumber,
    String receiverName,
    String receiverAccountNumber,
    BigDecimal amount,
    String currency,
    TransactionStatus status,
    Integer riskScore,
    String fraudReason,
    String reference,
    LocalDateTime timestamp
) {}
