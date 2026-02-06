package com.jmportfolio.jm.core;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

/**
 * @param <E>  type of the entity
 * @param <ID> id type of the entity
 */
@NoRepositoryBean
public interface BaseRepository<E, ID> extends JpaRepository<E, ID> {

}
