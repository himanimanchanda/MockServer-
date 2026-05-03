package com.telecom.mockserver.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator;
import com.telecom.mockserver.model.Mock;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;

import java.util.Collection;
import java.util.Map;

/**
 * Redis cache values use {@link GenericJackson2JsonRedisSerializer}, which needs:
 * <ul>
 *   <li>{@link com.fasterxml.jackson.datatype.jsr310.JavaTimeModule} (via app {@link ObjectMapper} copy)</li>
 *   <li>Jackson default typing so lists/entities deserialize as real types (not {@link java.util.LinkedHashMap})</li>
 * </ul>
 */
final class RedisObjectMapperConfigurer {

    private RedisObjectMapperConfigurer() {
    }

    /**
     * Typing is restricted to collection/map shapes and our cached entity type (internal Redis only).
     */
    @SuppressWarnings("deprecation")
    static ObjectMapper forRedisCache(ObjectMapper applicationMapper) {
        ObjectMapper redisMapper = applicationMapper.copy();

        PolymorphicTypeValidator ptv = BasicPolymorphicTypeValidator.builder()
                .allowIfSubType(Collection.class)
                .allowIfSubType(Map.class)
                .allowIfSubType(Mock.class)
                .allowIfSubType(Object[].class)
                .build();

        redisMapper.activateDefaultTyping(ptv, ObjectMapper.DefaultTyping.NON_FINAL, JsonTypeInfo.As.PROPERTY);
        GenericJackson2JsonRedisSerializer.registerNullValueSerializer(redisMapper, null);
        return redisMapper;
    }
}
