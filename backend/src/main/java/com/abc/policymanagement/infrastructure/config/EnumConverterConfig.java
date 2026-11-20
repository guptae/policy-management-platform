package com.abc.policymanagement.infrastructure.config;

import com.abc.policymanagement.domain.model.LineOfBusiness;
import com.abc.policymanagement.domain.model.PolicyStatus;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Lets query params use API labels (status=Active, lineOfBusiness=A&amp;H) instead of Java enum names.
 * A blank value is treated as "not supplied"; an unknown label results in a 400.
 */
@Configuration
public class EnumConverterConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, PolicyStatus.class,
                label -> label.isBlank() ? null : PolicyStatus.fromLabel(label.trim()));
        registry.addConverter(String.class, LineOfBusiness.class,
                label -> label.isBlank() ? null : LineOfBusiness.fromLabel(label.trim()));
    }
}
