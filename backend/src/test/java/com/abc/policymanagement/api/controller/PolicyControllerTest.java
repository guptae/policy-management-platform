package com.abc.policymanagement.api.controller;

import com.abc.policymanagement.api.mapper.PolicyMapperImpl;
import com.abc.policymanagement.domain.model.LineOfBusiness;
import com.abc.policymanagement.domain.model.Policy;
import com.abc.policymanagement.domain.model.PolicyStatus;
import com.abc.policymanagement.infrastructure.config.CorsConfig;
import com.abc.policymanagement.infrastructure.config.EnumConverterConfig;
import com.abc.policymanagement.service.PolicyService;
import com.abc.policymanagement.service.ResourceNotFoundException;
import com.abc.policymanagement.service.port.PageQuery;
import com.abc.policymanagement.service.port.PageResult;
import com.abc.policymanagement.service.port.PolicyFilter;
import com.abc.policymanagement.service.port.PolicySummary;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PolicyController.class)
@Import({PolicyMapperImpl.class, EnumConverterConfig.class, CorsConfig.class})
class PolicyControllerTest {

    private static final String PROBLEM_JSON = "application/problem+json";

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    PolicyService policyService;

    private static Policy policy(UUID id) {
        Policy p = new Policy();
        p.setId(id);
        p.setPolicyNumber("POL-000001");
        p.setPolicyholderName("Tanaka Hiroshi");
        p.setLineOfBusiness(LineOfBusiness.AH);
        p.setStatus(PolicyStatus.ACTIVE);
        p.setPremiumAmount(new BigDecimal("7270.00"));
        p.setCurrency("JPY");
        p.setEffectiveDate(LocalDate.of(2026, 1, 1));
        p.setExpiryDate(LocalDate.of(2027, 1, 1));
        p.setRegion("Japan");
        p.setUnderwriter("Okada Shinji");
        return p;
    }

    @Test
    void listPoliciesMapsLabelsToFiltersAndEnumsToLabels() throws Exception {
        PageResult<Policy> page = new PageResult<>(List.of(policy(UUID.randomUUID())), 0, 5, 1, 1);
        when(policyService.findAll(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/policies")
                        .param("status", "Active")
                        .param("lineOfBusiness", "A&H")
                        .param("region", "Japan")
                        .param("effectiveDateFrom", "2026-01-01")
                        .param("search", "Tanaka")
                        .param("page", "0")
                        .param("size", "5")
                        .param("sort", "premiumAmount,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").value("Active"))
                .andExpect(jsonPath("$.content[0].lineOfBusiness").value("A&H"))
                .andExpect(jsonPath("$.content[0].premiumAmount").value(7270.00))
                .andExpect(jsonPath("$.content[0].effectiveDate").value("2026-01-01"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.size").value(5));

        ArgumentCaptor<PolicyFilter> filter = ArgumentCaptor.forClass(PolicyFilter.class);
        ArgumentCaptor<PageQuery> query = ArgumentCaptor.forClass(PageQuery.class);
        verify(policyService).findAll(filter.capture(), query.capture());
        assertThat(filter.getValue().status()).isEqualTo(PolicyStatus.ACTIVE);
        assertThat(filter.getValue().lineOfBusiness()).isEqualTo(LineOfBusiness.AH);
        assertThat(filter.getValue().region()).isEqualTo("Japan");
        assertThat(filter.getValue().effectiveDateFrom()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(filter.getValue().search()).isEqualTo("Tanaka");
        assertThat(query.getValue()).isEqualTo(new PageQuery(0, 5, "premiumAmount", false));
    }

    @Test
    void listPoliciesDefaultsToPageZeroSizeTwenty() throws Exception {
        when(policyService.findAll(any(), any())).thenReturn(new PageResult<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/v1/policies")).andExpect(status().isOk());

        ArgumentCaptor<PageQuery> query = ArgumentCaptor.forClass(PageQuery.class);
        verify(policyService).findAll(any(), query.capture());
        assertThat(query.getValue()).isEqualTo(PageQuery.unsorted(0, 20));
    }

    @Test
    void sortWithoutDirectionDefaultsToAscending() throws Exception {
        when(policyService.findAll(any(), any())).thenReturn(new PageResult<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/v1/policies").param("sort", "expiryDate")).andExpect(status().isOk());

        ArgumentCaptor<PageQuery> query = ArgumentCaptor.forClass(PageQuery.class);
        verify(policyService).findAll(any(), query.capture());
        assertThat(query.getValue()).isEqualTo(new PageQuery(0, 20, "expiryDate", true));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "page | -1",
            "size | 0",
            "size | 2001",
            "sort | premiumAmount,sideways",
            "sort | premiumAmount,desc,extra"
    })
    void invalidPagingOrSortIsRejectedWith400ProblemDetail(String param, String value) throws Exception {
        mockMvc.perform(get("/api/v1/policies").param(param, value))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(policyService);
    }

    @Test
    void listPoliciesRejectsUnknownStatusLabelWith400ProblemDetail() throws Exception {
        mockMvc.perform(get("/api/v1/policies").param("status", "Bogus"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void getPolicyReturns404ProblemDetailWhenMissing() throws Exception {
        UUID id = UUID.randomUUID();
        when(policyService.findById(id)).thenThrow(new ResourceNotFoundException("Policy not found: " + id));

        mockMvc.perform(get("/api/v1/policies/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Policy not found: " + id));
    }

    @Test
    void getPolicyReturns400ForMalformedId() throws Exception {
        mockMvc.perform(get("/api/v1/policies/not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON));
    }

    @Test
    void flagPoliciesReturnsPerIdResults() throws Exception {
        UUID found = UUID.randomUUID();
        UUID missing = UUID.randomUUID();
        when(policyService.flagForReview(List.of(found, missing)))
                .thenReturn(Map.of(found, "updated", missing, "not_found"));

        mockMvc.perform(patch("/api/v1/policies/flag")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"policyIds\":[\"" + found + "\",\"" + missing + "\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results['" + found + "']").value("updated"))
                .andExpect(jsonPath("$.results['" + missing + "']").value("not_found"));
    }

    @Test
    void flagPoliciesRejectsEmptyListWithFieldErrors() throws Exception {
        mockMvc.perform(patch("/api/v1/policies/flag")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"policyIds\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[0].field").value("policyIds"));
    }

    @Test
    void getSummaryUsesLabelsAndPerCurrencyPremiums() throws Exception {
        Map<PolicyStatus, Long> counts = new EnumMap<>(PolicyStatus.class);
        counts.put(PolicyStatus.ACTIVE, 94L);
        counts.put(PolicyStatus.EXPIRED, 63L);
        Map<LineOfBusiness, Map<String, BigDecimal>> premiums = new EnumMap<>(LineOfBusiness.class);
        premiums.put(LineOfBusiness.AH, Map.of("JPY", new BigDecimal("1000.00")));
        when(policyService.getSummary()).thenReturn(new PolicySummary(counts, premiums, 14));

        mockMvc.perform(get("/api/v1/policies/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPolicies").value(157))
                .andExpect(jsonPath("$.countByStatus.Active").value(94))
                .andExpect(jsonPath("$.totalPremiumByLineOfBusiness['A&H'].JPY").value(1000.00))
                .andExpect(jsonPath("$.expiringSoonCount").value(14));
    }

    @Test
    void unexpectedErrorsReturnSanitised500() throws Exception {
        when(policyService.getSummary()).thenThrow(new IllegalStateException("jdbc:postgresql://secret-host boom"));

        mockMvc.perform(get("/api/v1/policies/summary"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("secret-host"))));
    }

    @Test
    void corsPreflightAllowsAngularOriginForPatch() throws Exception {
        mockMvc.perform(options("/api/v1/policies/flag")
                        .header("Origin", "http://localhost:4200")
                        .header("Access-Control-Request-Method", "PATCH")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
    }

    @Test
    void corsRejectsOtherOrigins() throws Exception {
        mockMvc.perform(options("/api/v1/policies")
                        .header("Origin", "http://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }
}
