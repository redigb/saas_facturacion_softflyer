<?php

namespace App\Core\Iam\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PasswordReset extends Model
{
    use BelongsToTenant;

    public const CREATED_AT = 'creado_en';

    public const UPDATED_AT = 'actualizado_en';

    protected $table = 'restablecimientos_contrasena';

    protected $fillable = ['usuario_id', 'token_hash', 'origen', 'expira_en', 'usado_en'];

    protected function casts(): array
    {
        return [
            'expira_en' => 'datetime',
            'usado_en' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
