package com.jmportfolio.jm.domains.usertemplates.infrastructure.entities;

import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.Type;
import org.hibernate.type.SqlTypes;

import com.jmportfolio.jm.core.BaseJpaEntity;
import com.jmportfolio.jm.domains.users.infrastructure.entities.UserJpaEntity;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "user_templates")
@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserTemplateJpaEntity extends BaseJpaEntity {
    @Type(JsonBinaryType.class)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data", columnDefinition = "JSONB")
    private List<Object> data;

    @Column(name = "template_type")
    private String templateType;

    @Column(name = "user_id")
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private UserJpaEntity user;
}
