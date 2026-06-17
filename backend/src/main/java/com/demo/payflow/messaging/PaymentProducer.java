package com.demo.payflow.messaging;

import com.demo.payflow.model.Transaction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentProducer {

    private final RabbitTemplate rabbitTemplate;

    @Value("${payflow.rabbitmq.exchange}")
    private String exchange;

    @Value("${payflow.rabbitmq.routing-key}")
    private String routingKey;

    public void publishPayment(Transaction transaction) {
        rabbitTemplate.convertAndSend(exchange, routingKey, transaction.getId());
        log.debug("Published to queue: {} ref={}", transaction.getId(), transaction.getReference());
    }
}
