# Local Arabic TTS Configuration

## Context

`conf.yaml` is intentionally gitignored and not tracked in this repository. TTS voice configuration changes are local-only.

## YAML Path

```yaml
character_config:
  tts_config:
    edge_tts:
      voice: 'ar-EG-SalmaNeural'
```

**Full path:** `character_config.tts_config.edge_tts.voice`

## Old/Default Voice

`en-US-AvaMultilingualNeural`

## Recommended Arabic Egyptian Voice

`ar-EG-SalmaNeural` (Egyptian Arabic, female, Edge TTS)

## Verification

After applying the config change, test Arabic TTS with:

```
أهلًا يا حسام، أنا جاهز أساعدك في شغلك.
```

## Remaining Pending

- Arabic ASR optimization is not configured yet. Current ASR uses SenseVoice (multilingual, supports Arabic).
