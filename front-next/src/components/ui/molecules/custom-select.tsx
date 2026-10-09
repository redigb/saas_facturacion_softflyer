"use client";

import React, { useEffect, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/icons";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: IconName;
}

export interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  "aria-describedby"?: string;
  className?: string;
}

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  disabled = false,
  hasError = false,
  "aria-describedby": ariaDescribedBy,
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const listboxId = `${id ?? "select"}-listbox`;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Botón Trigger de apertura */}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-2.5 text-left text-base transition-all focus:outline-none focus:ring-4 disabled:pointer-events-none disabled:opacity-60 ${
          hasError
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : isOpen
            ? "border-azul ring-4 ring-azul/10"
            : "border-slate-200 hover:border-slate-300 focus:border-azul focus:ring-azul/10"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {selectedOption?.icon ? (
            <Icon name={selectedOption.icon} className="h-4.5 w-4.5 shrink-0 text-slate-400" />
          ) : null}
          <span
            className={`block truncate ${
              selectedOption ? "font-medium text-tinta" : "text-slate-400"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <Icon
          name="abajo"
          className={`h-4.5 w-4.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-azul" : ""
          }`}
        />
      </button>

      {/* Menú desplegable flotante con ergonomía táctil */}
      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl transition-all"
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-center text-sm text-slate-400">
              No hay opciones disponibles
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[15px] transition-colors ${
                    isSelected
                      ? "bg-azul/10 font-bold text-azul"
                      : "text-tinta hover:bg-slate-50 hover:text-azul"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {option.icon ? (
                      <Icon
                        name={option.icon}
                        className={`h-4.5 w-4.5 shrink-0 ${
                          isSelected ? "text-azul" : "text-slate-400"
                        }`}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <span className="block truncate text-xs font-normal text-slate-500">
                          {option.description}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isSelected ? (
                    <Icon name="check" className="h-4 w-4 shrink-0 text-azul" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
