# FNOL System

First Notice of Loss intake and triage system. Accepts loss notifications from
all channels (web, mobile, phone, third-party adjusters), validates coverage,
and routes claims to the appropriate assessment workflow.

**Domain**: Claims
**Owner**: `claims-engineering`
**Components**: fnol-intake-service, fnol-triage-router, fnol-channel-adapter-service, coverage-verification-service, claimant-notification-service

## Architecture Overview

The FNOL System follows a pipeline pattern:

1. **Channel Adapter** normalizes inbound payloads from heterogeneous sources
   (REST, SOAP/ACORD XML, flat-file, EDI) into the canonical Claims Data Model
2. **Intake Service** validates mandatory FNOL fields and checks policy in-force status
3. **Coverage Verification** confirms the loss event falls within coverage scope
4. **Triage Router** applies configurable rules to route claims to the correct
   assessment queue (automated fast-track, virtual desk, or field adjuster dispatch)
5. **Notification Service** sends acknowledgements to claimants across channels
   (email, SMS, push, letter)

## Key Decisions

- [ADR-001: Channel Normalization via Adapter Pattern](adrs/001-channel-normalization.md)
- [ADR-002: Rules Engine for Triage Routing](adrs/002-triage-rules-engine.md)
