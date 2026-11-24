<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'ml' => [
        'python_path' => env('ML_PYTHON_PATH', 'C:\\Users\\epann\\AppData\\Local\\Programs\\Python\\Python310\\python.exe'),
        'predict_script' => env('ML_PREDICT_SCRIPT', base_path('../ml/src/predict.py')),
        'agent_script' => env('ML_AGENT_SCRIPT', base_path('../ml/src/self_learning_agent.py')),
    ],

    'ai_agent' => [
        'llm_api_url' => env('AI_AGENT_LLM_URL'),
        'llm_api_key' => env('AI_AGENT_LLM_KEY'),
        'llm_model' => env('AI_AGENT_LLM_MODEL', 'gemini-2.0-flash'),
        'allow_local_ollama' => (bool) env('AI_AGENT_ALLOW_LOCAL_OLLAMA', false),
    ],

    'mqtt' => [
        'host' => env('MQTT_HOST', 'broker.hivemq.com'),
        'port' => env('MQTT_PORT', 1883),
        'tls' => env('MQTT_TLS', false),
        'username' => env('MQTT_USERNAME'),
        'password' => env('MQTT_PASSWORD'),
    ],

    'realtime' => [
        'ws_host' => env('WS_HOST', '0.0.0.0'),
        'ws_port' => (int) env('WS_PORT', 8081),
        'ws_public_url' => env('WS_PUBLIC_URL', 'ws://127.0.0.1:8081'),
        'http_fallback_poll_ms' => (int) env('HTTP_FALLBACK_POLL_MS', 5000),
        'ws_connect_timeout_ms' => (int) env('WS_CONNECT_TIMEOUT_MS', 3000),
    ],

];
