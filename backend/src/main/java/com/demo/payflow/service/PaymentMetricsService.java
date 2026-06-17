package com.demo.payflow.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class PaymentMetricsService {

    private final Counter submittedCounter;
    private final Counter completedCounter;
    private final Counter flaggedCounter;
    private final Counter failedCounter;
    private final Counter volumeCounter;
    private final Timer   processingTimer;

    public PaymentMetricsService(MeterRegistry registry) {
        submittedCounter = Counter.builder("payflow_payments_submitted_total")
                .description("Total payments submitted")
                .register(registry);
        completedCounter = Counter.builder("payflow_payments_completed_total")
                .description("Total payments completed")
                .register(registry);
        flaggedCounter = Counter.builder("payflow_payments_flagged_total")
                .description("Total payments flagged for fraud")
                .register(registry);
        failedCounter = Counter.builder("payflow_payments_failed_total")
                .description("Total payments failed")
                .register(registry);
        volumeCounter = Counter.builder("payflow_payment_volume_gbp_total")
                .description("Total GBP volume of completed payments")
                .baseUnit("GBP")
                .register(registry);
        processingTimer = Timer.builder("payflow_payment_processing_seconds")
                .description("Time from PENDING to terminal state")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry);
    }

    public void recordSubmitted()                            { submittedCounter.increment(); }
    public void recordCompleted(BigDecimal amount)           { completedCounter.increment(); volumeCounter.increment(amount.doubleValue()); }
    public void recordFlagged()                              { flaggedCounter.increment(); }
    public void recordFailed()                               { failedCounter.increment(); }
    public void recordProcessingTime(long milliseconds)      { processingTimer.record(milliseconds, TimeUnit.MILLISECONDS); }
}
