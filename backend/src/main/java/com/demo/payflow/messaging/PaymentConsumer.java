package com.demo.payflow.messaging;

import com.demo.payflow.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentConsumer {

    private final PaymentService paymentService;

    @RabbitListener(queues = "${payflow.rabbitmq.queue}")
    public void onPayment(String transactionId) {
        log.info("Picked up from queue: {}", transactionId);
        paymentService.processPayment(transactionId);
    }
}
