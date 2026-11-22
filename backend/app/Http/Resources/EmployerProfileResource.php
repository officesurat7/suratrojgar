<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployerProfileResource extends JsonResource
{
    public bool $private = false;

    public function private(bool $on = true): static
    {
        $this->private = $on;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $p = $this->resource;
        $public = [
            'name' => $p->publicName(),
            'slug' => $p->slug,
            'company_type' => $p->company_type,
            'business_category' => $p->businessCategory?->name,
            'website' => $p->website,
            'city' => $p->city,
            'locality' => $p->locality?->name,
            'about' => $p->about,
            'company_size' => $p->company_size,
            'logo_url' => $p->logo_path ? url('storage/'.$p->logo_path) : null,
            'verified' => (bool) $p->verified_at,
        ];
        if (! $this->private) {
            return $public;
        }

        return $public + [
            'company_name' => $p->company_name,
            'display_name' => $p->display_name,
            'contact_person' => $p->contact_person,
            'business_category_id' => $p->business_category_id,
            'gstin' => $p->gstin,
            'state' => $p->state,
            'locality_id' => $p->locality_id,
            'area' => $p->area,
            'address' => $p->address,
            'pincode' => $p->pincode,
            'verified_at' => $p->verified_at?->toIso8601String(),
            'email' => $p->user?->email,
            'mobile' => $p->user?->mobile,
            'status' => $p->user?->status,
        ];
    }
}
