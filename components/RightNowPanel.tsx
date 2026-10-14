"use client";

import { Clocks } from "@/components/Clocks";
import { NightSky } from "@/components/NightSky";
import { TideSparkline } from "@/components/TideSparkline";
import { WeatherIcon } from "@/components/WeatherIcon";
import { site } from "@/content/site";
import { isIslandDaytime, weatherInfo, type Conditions } from "@/lib/conditions-shared";
import { formatTime, ISLAND_TZ } from "@/lib/time";
import { useNow } from "@/lib/use-now";

const round = (n: number | null | undefined) => (n == null ? null : Math.round(n));
const oneDp = (n: number | null | undefined) => (n == null ? null : n.toFixed(1));

function Stat({ label, value }: { label: string; value: string | null }) {
  if (value === null) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-foam/10 py-1.5">
      <dt className="text-foam-muted">{label}</dt>
      <dd className="font-mono font-semibold text-foam tabular-nums">{value}</dd>
    </div>
  );
}

export function RightNowPanel({ conditions }: { conditions: Conditions }) {
  const now = useNow();
  const { weather, marine } = conditions;
  const day = now === null || !weather ? null : isIslandDaytime(new Date(now), weather.sunrise, weather.sunset);
  const info = weather ? weatherInfo(weather.code, weather.isDay) : null;

  return (
    <div className="space-y-5">
      <Clocks />

      {day !== null && (
        <p className="flex items-start gap-3 rounded-[var(--radius-card)] bg-navy-2/80 px-4 py-3 text-foam ring-1 ring-foam/10">
          <WeatherIcon icon={day ? "sun" : "moon"} className={`mt-0.5 size-7 shrink-0 ${day ? "text-amber" : "text-foam-muted"}`} />
          <span>
            {day
              ? "Daytime on the island. The team is likely ashore working."
              : "Night on the island. The crew sleeps aboard the ship."}
            {weather?.sunrise && weather?.sunset && (
              <span className="block text-foam-muted">
                Sunrise {formatTime(new Date(weather.sunrise), ISLAND_TZ)} · sunset {formatTime(new Date(weather.sunset), ISLAND_TZ)}
              </span>
            )}
          </span>
        </p>
      )}

      {(weather || marine) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {weather && info && (
            <section aria-label="Weather" className="rounded-[var(--radius-card)] bg-navy-2/80 p-4 ring-1 ring-foam/10">
              <p className="flex items-center gap-2 text-foam-muted">
                <span className="live-dot" aria-hidden="true" /> Weather
              </p>
              <div className="mt-2 flex items-center gap-3">
                <WeatherIcon icon={info.icon} className="size-11 text-amber" />
                <p className="font-mono text-[2.2rem] leading-none font-semibold text-foam tabular-nums">
                  {round(weather.tempC)}°C
                </p>
              </div>
              <p className="mt-2 text-foam">{info.label}</p>
              <dl className="mt-2">
                <Stat label="Feels like" value={weather.feelsLikeC == null ? null : `${round(weather.feelsLikeC)}°C`} />
                <Stat
                  label="Wind"
                  value={
                    weather.windKmh == null
                      ? null
                      : `${round(weather.windKmh)} km/h${weather.gustKmh != null ? `, gusts ${round(weather.gustKmh)}` : ""}`
                  }
                />
              </dl>
            </section>
          )}
          {marine && (marine.waveM != null || marine.seaTempC != null || marine.swellM != null) && (
            <section aria-label="Sea" className="rounded-[var(--radius-card)] bg-navy-2/80 p-4 ring-1 ring-foam/10">
              <p className="flex items-center gap-2 text-foam-muted">
                <span className="live-dot" aria-hidden="true" /> Sea
              </p>
              <dl className="mt-2">
                <Stat label="Waves" value={marine.waveM == null ? null : `${oneDp(marine.waveM)} m`} />
                <Stat label="Swell" value={marine.swellM == null ? null : `${oneDp(marine.swellM)} m`} />
                <Stat label="Sea temperature" value={marine.seaTempC == null ? null : `${round(marine.seaTempC)}°C`} />
              </dl>
            </section>
          )}
        </div>
      )}

      {marine && marine.tide.length > 0 && now !== null && (
        <div className="rounded-[var(--radius-card)] bg-navy-2/80 p-4 ring-1 ring-foam/10">
          <TideSparkline tide={marine.tide} now={new Date(now)} />
        </div>
      )}

      <NightSky />

      {(weather || marine) && (
        <p className="text-[0.75rem] text-foam-muted">
          <a href={site.openMeteoUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-foam-muted/50">
            Weather data by Open-Meteo.com
          </a>
        </p>
      )}
    </div>
  );
}
