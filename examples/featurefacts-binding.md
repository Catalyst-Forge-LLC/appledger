# FeatureFacts binding pattern

Illustrative fragment, not a replacement FeatureFacts schema or a scan result. Use actual native schema versions and IDs from the target register.

```yaml
bindings:
  - id: features-main
    family: featurefacts
    subject_id: app-example
    repository_id: repo-main
    path: .featurefacts/features.yaml
```

An AppLedger `capability_ref` record sets `data.external_ref` to `binding:<binding-id>#<native-id>`. A full synthetic record is [capability-ref.md](capability-ref.md). It can relate that capability to a use case, goal, component, and work item using the predicate table. The adapter resolves the native ID using FeatureFacts' actual schema. Do not copy lifecycle, recognition, maturity, or availability into independently editable AppLedger fields.

When work retires the capability, update the native register, maintain its retirement history, reconcile label selection, and write an AppLedger change record referencing the same capability identity. Public output still follows FeatureFacts filtering and approval.
