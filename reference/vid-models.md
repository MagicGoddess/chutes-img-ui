# Chutes Video Models Schemas

## Wan2.1 14b text2video (wan2.1-14b)
### Example
```sh
curl -X POST \
		https://chutes-wan2-1-14b.chutes.ai/text2video \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "fps": 24,
    "seed": 42,
    "steps": 25,
    "prompt": "example-string",
    "resolution": "832*480",
    "sample_shift": null
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/text_to_video",
  "function": "text_to_video",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/text2video",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/VideoGenInput"
      }
    },
    "definitions": {
      "VideoGenInput": {
        "type": "object",
        "$defs": {
          "Resolution": {
            "enum": [
              "1280*720",
              "720*1280",
              "832*480",
              "480*832",
              "1024*1024"
            ],
            "type": "string",
            "title": "Resolution"
          }
        },
        "required": [
          "prompt"
        ],
        "properties": {
          "fps": {
            "type": "integer",
            "title": "Fps",
            "default": 24,
            "maximum": 60,
            "minimum": 16
          },
          "seed": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 42
          },
          "steps": {
            "type": "integer",
            "title": "Steps",
            "default": 25,
            "maximum": 30,
            "minimum": 10
          },
          "frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 241,
                "minimum": 81
              },
              {
                "type": "null"
              }
            ],
            "title": "Frames",
            "default": 81
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "resolution": {
            "anyOf": [
              {
                "$ref": "#/definitions/Resolution"
              },
              {
                "type": "null"
              }
            ],
            "default": "832*480"
          },
          "sample_shift": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Sample Shift",
            "default": null
          },
          "single_frame": {
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ],
            "title": "Single Frame",
            "default": false
          },
          "guidance_scale": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7.5,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Guidance Scale",
            "default": 5
          },
          "negative_prompt": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Negative Prompt",
            "default": "Vibrant colors, overexposed, static, blurry details, subtitles, style, artwork, painting, picture, still, overall grayish, worst quality, low quality, JPEG compression artifacts, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn face, deformed, disfigured, malformed limbs, fused fingers, motionless image, cluttered background, three legs, many people in the background, walking backwards, slow motion"
          }
        }
      }
    }
  },
  "output_schema": null,
  "output_content_type": "video/mp4",
  "minimal_input_schema": null
}
```

## Wan2.1 14b image2video (wan2.1-14b)
### Example
```sh
curl -X POST \
		https://chutes-wan2-1-14b.chutes.ai/image2video \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "seed": 42,
    "frames": 81,
    "prompt": "example-string",
    "image_b64": "example-string",
    "sample_shift": null,
    "guidance_scale": 5
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/image_to_video",
  "function": "image_to_video",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/image2video",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "args"
    ],
    "properties": {
      "args": {
        "$ref": "#/definitions/I2VInput"
      }
    },
    "definitions": {
      "I2VInput": {
        "type": "object",
        "required": [
          "prompt",
          "image_b64"
        ],
        "properties": {
          "fps": {
            "type": "integer",
            "title": "Fps",
            "default": 24,
            "maximum": 60,
            "minimum": 16
          },
          "seed": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": 42
          },
          "steps": {
            "type": "integer",
            "title": "Steps",
            "default": 25,
            "maximum": 30,
            "minimum": 10
          },
          "frames": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 241,
                "minimum": 81
              },
              {
                "type": "null"
              }
            ],
            "title": "Frames",
            "default": 81
          },
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "image_b64": {
            "type": "string",
            "title": "Image B64"
          },
          "sample_shift": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Sample Shift",
            "default": null
          },
          "single_frame": {
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ],
            "title": "Single Frame",
            "default": false
          },
          "guidance_scale": {
            "anyOf": [
              {
                "type": "number",
                "maximum": 7.5,
                "minimum": 1
              },
              {
                "type": "null"
              }
            ],
            "title": "Guidance Scale",
            "default": 5
          },
          "negative_prompt": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Negative Prompt",
            "default": "Vibrant colors, overexposed, static, blurry details, subtitles, style, artwork, painting, picture, still, overall grayish, worst quality, low quality, JPEG compression artifacts, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn face, deformed, disfigured, malformed limbs, fused fingers, motionless image, cluttered background, three legs, many people in the background, walking backwards, slow motion"
          }
        }
      }
    }
  },
  "output_schema": null,
  "output_content_type": "video/mp4",
  "minimal_input_schema": null
}
```

## Musetalk (musetalk)
### Example
```sh
curl -X POST \
		https://chutes-musetalk.chutes.ai/generate \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
		-H "Content-Type: application/json" \
		-d '  {
    "fps": 25,
    "batch_size": 8,
    "audio_input": "example-string",
    "video_input": "example-string",
    "extra_margin": 10,
    "parsing_mode": "jaw",
    "left_cheek_width": 90,
    "right_cheek_width": 90
  }'
```
### Schema
```json
{
  "method": "POST",
  "path": "/generate_lipsync",
  "function": "generate_lipsync",
  "stream": false,
  "passthrough": false,
  "public_api_path": "/generate",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "input_args"
    ],
    "properties": {
      "input_args": {
        "$ref": "#/definitions/MuseTalkInput"
      }
    },
    "definitions": {
      "MuseTalkInput": {
        "type": "object",
        "required": [
          "video_input",
          "audio_input"
        ],
        "properties": {
          "fps": {
            "type": "integer",
            "title": "Fps",
            "default": 25,
            "maximum": 60,
            "minimum": 1,
            "description": "Output video FPS"
          },
          "batch_size": {
            "type": "integer",
            "title": "Batch Size",
            "default": 8,
            "maximum": 32,
            "minimum": 1,
            "description": "Batch size for inference"
          },
          "audio_input": {
            "type": "string",
            "title": "Audio Input",
            "description": "Base64 encoded audio or HTTPS URL"
          },
          "video_input": {
            "type": "string",
            "title": "Video Input",
            "description": "Base64 encoded video or HTTPS URL"
          },
          "extra_margin": {
            "type": "integer",
            "title": "Extra Margin",
            "default": 10,
            "maximum": 50,
            "minimum": 0,
            "description": "Extra margin for face crop"
          },
          "parsing_mode": {
            "type": "string",
            "title": "Parsing Mode",
            "default": "jaw",
            "description": "Face blending mode"
          },
          "left_cheek_width": {
            "type": "integer",
            "title": "Left Cheek Width",
            "default": 90,
            "maximum": 200,
            "minimum": 0,
            "description": "Left cheek width"
          },
          "right_cheek_width": {
            "type": "integer",
            "title": "Right Cheek Width",
            "default": 90,
            "maximum": 200,
            "minimum": 0,
            "description": "Right cheek width"
          }
        }
      }
    }
  },
  "output_schema": {},
  "output_content_type": "video/mp4",
  "minimal_input_schema": null
}
```