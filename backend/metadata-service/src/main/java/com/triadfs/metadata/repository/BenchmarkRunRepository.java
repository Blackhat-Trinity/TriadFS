package com.triadfs.metadata.repository;

import com.triadfs.common.model.StrategyType;
import com.triadfs.metadata.model.BenchmarkRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BenchmarkRunRepository extends JpaRepository<BenchmarkRunEntity, UUID> {
    List<BenchmarkRunEntity> findTop100ByOrderByStartedAtDesc();

    List<BenchmarkRunEntity> findByStrategyNameOrderByTransferTimeMsAsc(StrategyType strategyName);
}