<?php

namespace Database\Seeders;

use App\Models\Locality;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Surat areas with zone, PIN code and approximate centre coordinates (used only for "sort by location").
 * PIN codes and coordinates are indicative. Admins can correct them in Admin → Taxonomy → Localities.
 */
class SuratLocalitySeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            // name, zone, pincode, lat, lng
            ['Adajan', 'West', '395009', 21.1959, 72.7933], ['Pal', 'West', '395009', 21.2007, 72.7639],
            ['Rander', 'West', '395005', 21.2180, 72.7930], ['Jahangirpura', 'West', '395005', 21.2350, 72.7900],
            ['Palanpur Patia', 'West', '395009', 21.2100, 72.7750], ['Hazira', 'West', '394270', 21.1180, 72.6380],
            ['Ichchhapor', 'West', '394510', 21.1530, 72.6550], ['Athwa', 'South West', '395001', 21.1780, 72.8090],
            ['Ghod Dod Road', 'South West', '395007', 21.1735, 72.8010], ['City Light', 'South West', '395007', 21.1600, 72.7900],
            ['Vesu', 'South West', '395007', 21.1418, 72.7709], ['Piplod', 'South West', '395007', 21.1556, 72.7716],
            ['Dumas', 'South West', '395007', 21.0800, 72.7200], ['Althan', 'South West', '395017', 21.1462, 72.8031],
            ['Bhatar', 'South West', '395017', 21.1600, 72.8050], ['Parle Point', 'South West', '395007', 21.1680, 72.7920],
            ['Nanpura', 'Central', '395001', 21.1890, 72.8160], ['Majura Gate', 'Central', '395002', 21.1850, 72.8250],
            ['Ring Road', 'Central', '395002', 21.1950, 72.8400], ['Chowk Bazaar', 'Central', '395003', 21.1980, 72.8220],
            ['Salabatpura', 'Central', '395003', 21.1960, 72.8350], ['Sagrampura', 'Central', '395002', 21.1880, 72.8300],
            ['Varachha', 'East', '395006', 21.2100, 72.8667], ['Mota Varachha', 'East', '394101', 21.2380, 72.8780],
            ['Sarthana', 'East', '395006', 21.2320, 72.9020], ['Kapodra', 'East', '395006', 21.2160, 72.8750],
            ['Puna', 'East', '395010', 21.1990, 72.8800], ['Parvat Patiya', 'East', '395010', 21.1840, 72.8700],
            ['Magob', 'East', '395010', 21.1990, 72.8950], ['Godadara', 'South East', '395010', 21.1580, 72.8680],
            ['Limbayat', 'South East', '394210', 21.1720, 72.8650], ['Dindoli', 'South East', '394210', 21.1410, 72.8650],
            ['Udhna', 'South', '394210', 21.1667, 72.8333], ['Pandesara', 'South', '394221', 21.1450, 72.8380],
            ['Bhestan', 'South', '395023', 21.1280, 72.8450], ['Sachin', 'South', '394230', 21.0860, 72.8820],
            ['Katargam', 'North', '395004', 21.2290, 72.8320], ['Amroli', 'North', '394107', 21.2470, 72.8510],
            ['Utran', 'North', '394105', 21.2380, 72.8550], ['Kosad', 'North', '394107', 21.2600, 72.8650],
            ['Ved Road', 'North', '395004', 21.2180, 72.8250], ['Olpad', 'Outskirts', '394540', 21.3360, 72.7520],
            ['Kamrej', 'Outskirts', '394185', 21.2700, 72.9600], ['Palsana', 'Outskirts', '394315', 21.0800, 72.9800],
            ['Kadodara', 'Outskirts', '394327', 21.1700, 72.9580],
        ];
        foreach ($rows as $i => [$name, $zone, $pin, $lat, $lng]) {
            Locality::updateOrCreate(['slug' => Str::slug($name)], [
                'name' => $name, 'zone' => $zone, 'pincode' => $pin, 'latitude' => $lat, 'longitude' => $lng, 'sort_order' => $i,
            ]);
        }
    }
}
