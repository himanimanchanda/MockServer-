package com.telecom.mockserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.beans.factory.ObjectProvider;
import com.telecom.mockserver.security.JwtAuthFilter;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@Configuration
public class SecurityConfig {

    @Value("${mockserver.auth.enabled:false}")
    private boolean authEnabled;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return olmId -> {
            throw new UsernameNotFoundException("No local users, only JWT allowed");
        };
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectProvider<JwtAuthFilter> jwtAuthFilterProvider) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(h -> h.frameOptions(fo -> fo.sameOrigin()));

        if (!authEnabled) {
            // Auth is OFF → allow EVERYTHING — no 403, no 401, no token needed.
            // This is the default mode for demo / PPO / Postman testing.
            http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        } else {
            // Auth is ON → require JWT for everything except auth + actuator endpoints
            http.authorizeHttpRequests(auth -> {
                auth.requestMatchers("/auth/**").permitAll();
                auth.requestMatchers("/actuator/**").permitAll();
                auth.anyRequest().authenticated();
            });

            JwtAuthFilter jwtAuthFilter = jwtAuthFilterProvider.getIfAvailable();
            if (jwtAuthFilter != null) {
                http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
            }
        }

        return http.build();
    }
}
