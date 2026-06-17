package com.demo.payflow.repository;

import com.demo.payflow.model.FraudAlert;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FraudAlertRepository extends JpaRepository<FraudAlert, String> {
    List<FraudAlert> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
