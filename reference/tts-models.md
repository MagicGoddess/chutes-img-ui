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

## Spark Tts (spark-tts)

### Example
```sh
curl -X POST \
		https://chutes-spark-tts.chutes.ai/speak \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "text": "example-string",
    "pitch": "moderate",
    "top_k": 50,
    "top_p": 0.95,
    "gender": "female",
    "sample_audio_b64": null,
    "sample_audio_text": null
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
          "Gender": {
            "enum": [
              "male",
              "female"
            ],
            "type": "string",
            "title": "Gender"
          },
          "SpeechOption": {
            "enum": [
              "very_low",
              "low",
              "moderate",
              "high",
              "very_high"
            ],
            "type": "string",
            "title": "SpeechOption"
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
          "pitch": {
            "anyOf": [
              {
                "$ref": "#/definitions/SpeechOption"
              },
              {
                "type": "null"
              }
            ],
            "default": "moderate"
          },
          "speed": {
            "anyOf": [
              {
                "$ref": "#/definitions/SpeechOption"
              },
              {
                "type": "null"
              }
            ],
            "default": "moderate"
          },
          "top_k": {
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "title": "Top K",
            "default": 50
          },
          "top_p": {
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "title": "Top P",
            "default": 0.95
          },
          "gender": {
            "anyOf": [
              {
                "$ref": "#/definitions/Gender"
              },
              {
                "type": "null"
              }
            ],
            "default": "female"
          },
          "temperature": {
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "title": "Temperature",
            "default": 0.8
          },
          "sample_audio_b64": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Sample Audio B64",
            "default": null
          },
          "sample_audio_text": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Sample Audio Text",
            "default": null
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

## Cosy Voice Tts 16g (cosy-voice-tts-16g)

### Example
```sh
curl -X POST \
		https://kikakkz-cosy-voice-tts-16g.chutes.ai/v1/speak \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "text": "example-string",
    "prompt_audio_b64": "example-string",
    "prompt_audio_text": "example-string"
  }'
```

### Schema
```json
{
  "method": "POST",
  "path": "/v1/speak",
  "function": "speak_v1",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/v1/speak",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/V1InputArgs"
      }
    },
    "definitions": {
      "V1InputArgs": {
        "type": "object",
        "required": [
          "text",
          "prompt_audio_b64",
          "prompt_audio_text"
        ],
        "properties": {
          "text": {
            "type": "string",
            "title": "Text"
          },
          "speed": {
            "type": "number",
            "title": "Speed",
            "default": 1
          },
          "prompt_audio_b64": {
            "type": "string",
            "title": "Prompt Audio B64"
          },
          "prompt_audio_text": {
            "type": "string",
            "title": "Prompt Audio Text"
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