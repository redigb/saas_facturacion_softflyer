<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

class ArchitectureTest extends TestCase
{
    public function test_core_never_depends_on_modules(): void
    {
        $this->assertNoReference(__DIR__.'/../../app/Core', 'App\\Modules\\');
    }

    public function test_core_and_modules_never_depend_on_the_platform_backoffice(): void
    {
        $this->assertNoReference(__DIR__.'/../../app/Core', 'App\\Platform\\');
        $this->assertNoReference(__DIR__.'/../../app/Modules', 'App\\Platform\\');
    }

    public function test_domain_does_not_depend_on_framework_or_outer_layers(): void
    {
        $domainPaths = array_merge(
            glob(__DIR__.'/../../app/Core/*/Domain', GLOB_ONLYDIR) ?: [],
            glob(__DIR__.'/../../app/Modules/*/Domain', GLOB_ONLYDIR) ?: [],
        );

        foreach ($domainPaths as $domainPath) {
            foreach (['Illuminate\\', '\\Infrastructure\\', '\\Presentation\\', '\\Application\\'] as $forbidden) {
                $this->assertNoReference($domainPath, $forbidden);
            }
        }
    }

    private function assertNoReference(string $path, string $forbidden): void
    {
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path, RecursiveDirectoryIterator::SKIP_DOTS));

        foreach ($files as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }

            $this->assertStringNotContainsString(
                $forbidden,
                file_get_contents($file->getPathname()),
                "{$file->getPathname()} no puede depender de {$forbidden}",
            );
        }

        $this->addToAssertionCount(1);
    }
}
