<?php

namespace App\Providers;

use App\Services\Settings;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Settings::class);
    }

    public function boot(): void
    {
        // Catch N+1 queries and mass-assignment mistakes during development/testing
        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        if ($this->app->isProduction()) {
            URL::forceScheme('https');
        }

        $by = fn (Request $r) => $r->user()?->id ? 'u'.$r->user()->id : 'ip'.$r->ip();

        // Anti-scraping: public listing/detail endpoints per IP
        RateLimiter::for('public', fn (Request $r) => [Limit::perMinute(120)->by('ip'.$r->ip()), Limit::perDay(10000)->by('ipd'.$r->ip())]);
        RateLimiter::for('beacon', fn (Request $r) => Limit::perMinute(60)->by('ip'.$r->ip()));
        RateLimiter::for('forms', fn (Request $r) => [Limit::perMinute(3)->by($by($r)), Limit::perDay(20)->by('d'.$by($r))]);
        RateLimiter::for('register', fn (Request $r) => [Limit::perMinute(5)->by('ip'.$r->ip()), Limit::perDay(30)->by('ipd'.$r->ip())]);
        RateLimiter::for('otp', fn (Request $r) => [Limit::perMinute(10)->by('ip'.$r->ip()), Limit::perHour(60)->by('iph'.$r->ip())]);
        RateLimiter::for('login', fn (Request $r) => [Limit::perMinute(10)->by('ip'.$r->ip()), Limit::perHour(100)->by('iph'.$r->ip())]);
        RateLimiter::for('user', fn (Request $r) => Limit::perMinute(180)->by($by($r)));
        RateLimiter::for('admin', fn (Request $r) => Limit::perMinute(300)->by($by($r)));
        RateLimiter::for('apply', fn (Request $r) => [Limit::perMinute(10)->by($by($r)), Limit::perDay(100)->by('d'.$by($r))]);
        RateLimiter::for('uploads', fn (Request $r) => Limit::perHour(30)->by($by($r)));
        // Employer contact reveals: burst limit here, daily quota enforced in the controller
        RateLimiter::for('contact', fn (Request $r) => [Limit::perMinute(10)->by($by($r)), Limit::perHour(60)->by('h'.$by($r))]);
    }
}
