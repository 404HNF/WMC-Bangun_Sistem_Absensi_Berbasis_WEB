<?php
declare(strict_types=1);

/*
 * Database and application configuration.
 * Update these values to match your local or production environment.
 */
const DB_HOST = '127.0.0.1';
const DB_PORT = '3306';
const DB_NAME = 'attendance_db';
const DB_USER = 'root';
const DB_PASS = '';

const APP_TIMEZONE = 'Asia/Jakarta';
const ON_TIME_MINUTES = 10;
const DEFAULT_SESSION_DURATION = 60;
const SESSION_COOKIE_NAME = 'wmc_admin_session';
const SESSION_LIFETIME = 7200;

date_default_timezone_set(APP_TIMEZONE);
