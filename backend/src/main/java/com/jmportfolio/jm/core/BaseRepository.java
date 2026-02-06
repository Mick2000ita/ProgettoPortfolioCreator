package com.jmportfolio.jm.core;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;

/**
 * @param <E>  type of the entity
 * @param <ID> id type of the entity
 */
@NoRepositoryBean
public interface BaseRepository<E, ID> extends JpaRepository<E, ID> {
  /**
   * @param filterDto dto of filter (support for string, bigDecimal, date,
   *                  ManyToOne relations),
   *                  fields must be well formatted
   * @param page      pagination and sorting
   * @param <F>       type of the filterDto
   * @return page of entities
   */
  <F> Page<E> findFiltered(F filterDto, Pageable page);

  /**
   * @param filterDto dto of filter (support for string, bigDecimal, date,
   *                  ManyToOne relations),
   *                  fields must be well formatted
   * @param sort      sorting
   * @param <F>       type of the filterDto
   * @return page of entities
   */
  <F> List<E> findFiltered(F filterDto, Sort sort);
}
