package com.abc.policymanagement.api.controller;

import com.abc.policymanagement.api.dto.BulkFlagRequest;
import com.abc.policymanagement.api.dto.BulkFlagResponse;
import com.abc.policymanagement.api.dto.PagedPolicyResponse;
import com.abc.policymanagement.api.dto.PolicyResponse;
import com.abc.policymanagement.api.dto.PolicySummaryResponse;
import com.abc.policymanagement.api.mapper.PolicyMapper;
import com.abc.policymanagement.domain.model.LineOfBusiness;
import com.abc.policymanagement.domain.model.PolicyStatus;
import com.abc.policymanagement.service.PolicyService;
import com.abc.policymanagement.service.port.PolicyFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/policies")
@Tag(name = "Policies", description = "Policy search, retrieval, summary and flagging")
public class PolicyController {

    private static final String PROBLEM_JSON = "application/problem+json";

    private final PolicyService policyService;
    private final PolicyMapper policyMapper;

    public PolicyController(PolicyService policyService, PolicyMapper policyMapper) {
        this.policyService = policyService;
        this.policyMapper = policyMapper;
    }

    @GetMapping
    @Operation(operationId = "listPolicies", summary = "List policies (paged, filterable, sortable)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "A page of policies."),
            @ApiResponse(responseCode = "400", description = "Invalid request.",
                    content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ProblemDetail.class)))
    })
    public PagedPolicyResponse<PolicyResponse> listPolicies(
            @Parameter(schema = @Schema(allowableValues = {"Active", "Expired", "Pending", "Cancelled"}))
            @RequestParam(required = false) PolicyStatus status,
            @Parameter(schema = @Schema(allowableValues = {"Property", "Casualty", "A&H", "Marine"}))
            @RequestParam(required = false) LineOfBusiness lineOfBusiness,
            @RequestParam(required = false) String region,
            @Parameter(description = "Include policies with an effective date on or after this date.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDateFrom,
            @Parameter(description = "Include policies with an effective date on or before this date.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDateTo,
            @Parameter(description = "Free-text search on policy number or policyholder name.")
            @RequestParam(required = false) String search,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        PolicyFilter filter = new PolicyFilter(status, lineOfBusiness, region, effectiveDateFrom, effectiveDateTo, search);
        return policyMapper.toPagedResponse(policyService.findAll(filter, pageable));
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getPolicyById", summary = "Get a policy by id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "The policy."),
            @ApiResponse(responseCode = "400", description = "Invalid id.",
                    content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "404", description = "Policy not found.",
                    content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ProblemDetail.class)))
    })
    public PolicyResponse getPolicy(@PathVariable UUID id) {
        return policyMapper.toResponse(policyService.findById(id));
    }

    @PatchMapping("/flag")
    @Operation(operationId = "flagPolicies", summary = "Flag multiple policies for review in bulk")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Per-policy outcome of the flag operation."),
            @ApiResponse(responseCode = "400", description = "Invalid request body.",
                    content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ProblemDetail.class)))
    })
    public BulkFlagResponse flagPolicies(@RequestBody @Valid BulkFlagRequest request) {
        return new BulkFlagResponse(policyService.flagForReview(request.policyIds()));
    }

    @GetMapping("/summary")
    @Operation(operationId = "getPolicySummary", summary = "Get aggregate policy summary")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Aggregate figures across policies."))
    public PolicySummaryResponse getSummary() {
        return policyMapper.toSummaryResponse(policyService.getSummary());
    }
}
