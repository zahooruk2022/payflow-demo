package com.demo.payflow.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PaymentRequest(
    @NotBlank String senderAccountId,
    @NotBlank String receiverAccountId,
    @NotNull @DecimalMin("0.01") BigDecimal amount,
    String currency,
    String description
) {}
