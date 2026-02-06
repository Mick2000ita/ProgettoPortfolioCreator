package com.jmportfolio.jm.core;

import java.sql.Timestamp;
import java.util.Objects;
import java.util.UUID;

import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@MappedSuperclass
public class BaseJpaEntity {
    @Id
    @ColumnDefault("gen_random_uuid()")
    private UUID id = UUID.randomUUID();

    @Override
    public int hashCode() {
        return id.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        BaseJpaEntity other = (BaseJpaEntity) obj;
        return Objects.equals(id, other.getId());
    }

    @CreationTimestamp
    @Column(insertable = false, updatable = false)
    @ColumnDefault("'(now() AT TIME ZONE 'UTC')'")
    private Timestamp created;

    @UpdateTimestamp
    @Column(insertable = false)
    @ColumnDefault("'(now() AT TIME ZONE 'UTC')'")
    private Timestamp updated;

}
