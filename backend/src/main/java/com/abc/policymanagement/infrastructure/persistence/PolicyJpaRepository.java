package com.abc.policymanagement.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PolicyJpaRepository
        extends JpaRepository<PolicyEntity, UUID>, JpaSpecificationExecutor<PolicyEntity> {

    // Bulk UPDATE bypasses @PreUpdate, so the caller passes Instant.now() as :now.
    @Modifying
    @Transactional
    @Query("UPDATE PolicyEntity p SET p.flaggedForReview = true, p.updatedAt = :now WHERE p.id IN :ids")
    int bulkFlag(@Param("ids") List<UUID> ids, @Param("now") Instant now);

    @Query("SELECT p.id FROM PolicyEntity p WHERE p.id IN :ids")
    List<UUID> findExistingIds(@Param("ids") List<UUID> ids);

    @Query("SELECT p.status, COUNT(p) FROM PolicyEntity p GROUP BY p.status")
    List<Object[]> countByStatus();

    @Query("SELECT p.lineOfBusiness, p.currency, SUM(p.premiumAmount) FROM PolicyEntity p "
            + "GROUP BY p.lineOfBusiness, p.currency")
    List<Object[]> totalPremiumByLobAndCurrency();

    @Query("SELECT COUNT(p) FROM PolicyEntity p WHERE p.expiryDate BETWEEN CURRENT_DATE AND :cutoff")
    long countExpiringSoon(@Param("cutoff") LocalDate cutoff);
}
