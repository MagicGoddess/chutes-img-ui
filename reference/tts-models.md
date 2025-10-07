# Chutes Text-to-Speech Models Schemas

## Kokoro (kokoro)

### Example
```sh
curl -X POST \
		https://chutes-kokoro.chutes.ai/speak \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "text": "example-string",
    "speed": 1
  }'
```

### Schema
```json
{
  "method": "POST",
  "path": "/speak",
  "function": "speak",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/speak",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/InputArgs"
      }
    },
    "definitions": {
      "InputArgs": {
        "type": "object",
        "$defs": {
          "Voice": {
            "enum": [
              "af_heart",
              "af_alloy",
              "af_aoede",
              "af_bella",
              "af_heart",
              "af_jessica",
              "af_kore",
              "af_nicole",
              "af_nova",
              "af_river",
              "af_sarah",
              "af_sky",
              "am_adam",
              "am_echo",
              "am_eric",
              "am_fenrir",
              "am_liam",
              "am_michael",
              "am_onyx",
              "am_puck",
              "am_santa",
              "bf_alice",
              "bf_emma",
              "bf_isabella",
              "bf_lily",
              "bm_daniel",
              "bm_fable",
              "bm_george",
              "bm_lewis",
              "ef_dora",
              "em_alex",
              "em_santa",
              "ff_siwis",
              "hf_alpha",
              "hf_beta",
              "hm_omega",
              "hm_psi",
              "if_sara",
              "im_nicola",
              "jf_alpha",
              "jf_gongitsune",
              "jf_nezumi",
              "jf_tebukuro",
              "jm_kumo",
              "pf_dora",
              "pm_alex",
              "pm_santa",
              "zf_xiaobei",
              "zf_xiaoni",
              "zf_xiaoxiao",
              "zf_xiaoyi",
              "zm_yunjian",
              "zm_yunxi",
              "zm_yunxia",
              "zm_yunyang"
            ],
            "type": "string",
            "title": "Voice"
          }
        },
        "required": [
          "text"
        ],
        "properties": {
          "text": {
            "type": "string",
            "title": "Text"
          },
          "speed": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 3,
                "minimum": 0.1
              },
              {
                "type": "null"
              }
            ],
            "title": "Speed",
            "default": 1,
            "description": "Voice output speed."
          },
          "voice": {
            "$ref": "#/definitions/Voice",
            "default": "af_heart",
            "description": "Voice selection for text-to-speech"
          }
        }
      }
    }
  },
  "output_schema": {},
  "output_content_type": "audio/wav",
  "minimal_input_schema": null
}
```

## Csm 1b (csm-1b)

### Example
```sh
curl -X POST \
		https://chutes-csm-1b.chutes.ai/speak \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "text": "example-string",
    "speaker": 1
  }'
```

### Schema
```json
{
  "method": "POST",
  "path": "/speak",
  "function": "speak",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/speak",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/InputArgs"
      }
    },
    "definitions": {
      "InputArgs": {
        "type": "object",
        "$defs": {
          "Context": {
            "type": "object",
            "title": "Context",
            "required": [
              "text",
              "audio_b64"
            ],
            "properties": {
              "text": {
                "type": "string",
                "title": "Text"
              },
              "speaker": {
                "gte": 0,
                "lte": 1,
                "type": "integer",
                "title": "Speaker",
                "default": 0
              },
              "audio_b64": {
                "type": "string",
                "title": "Audio B64"
              }
            }
          }
        },
        "required": [
          "text"
        ],
        "properties": {
          "text": {
            "type": "string",
            "title": "Text"
          },
          "context": {
            "anyOf": [
              {
                "type": "array",
                "items": {
                  "$ref": "#/definitions/Context"
                }
              },
              {
                "type": "null"
              }
            ],
            "title": "Context",
            "default": []
          },
          "speaker": {
            "gte": 0,
            "lte": 1,
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Speaker",
            "default": 1
          },
          "max_duration_ms": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Max Duration Ms",
            "default": 10000
          }
        }
      }
    }
  },
  "output_schema": {},
  "output_content_type": "audio/wav",
  "minimal_input_schema": null
}
```