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
    ],

    'mqtt' => [
        'host' => env('MQTT_HOST', 'broker.hivemq.com'),
        'port' => env('MQTT_PORT', 1883),
        'tls' => env('MQTT_TLS', false),
        'username' => env('MQTT_USERNAME'),
        'password' => env('MQTT_PASSWORD'),
    ],

];
