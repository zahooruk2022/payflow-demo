package com.demo.payflow.dto;

import java.math.BigDecimal;

public record DashboardStats(
    long totalTransactions,
    long completedTransactions,
    long pendingTransactions,
    long flaggedTransactions,
    BigDecimal totalVolume,
    double fraudRate,
    double successRate
) {}
