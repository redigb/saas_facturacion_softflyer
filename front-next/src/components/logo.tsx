import Image from "next/image";

import logoLight from "../../public/softflyer-logo.png";
import logoDark from "../../public/softflyer-logo-dark.png";
import logoIcon from "../../public/softflyer-icon.png";

type LogoProps = {
  className?: string;
  priority?: boolean;
};

/** Logo oficial que se adapta automáticamente a modo claro y modo oscuro sin fondo blanco invasivo. */
export function Logo({ className = "h-12 w-auto", priority = false }: LogoProps) {
  return (
    <>
      <Image
        src={logoLight}
        alt="Softflyer"
        priority={priority}
        className={`${className} softflyer-logo-light`}
      />
      <Image
        src={logoDark}
        alt="Softflyer"
        priority={priority}
        className={`${className} softflyer-logo-dark`}
      />
    </>
  );
}

/** Isotipo oficial (ala cian y avión origami amarillo) con fondo transparente para vistas compactas. */
export function LogoIcon({ className = "size-8", priority = false }: LogoProps) {
  return (
    <Image
      src={logoIcon}
      alt="Softflyer"
      priority={priority}
      className={`${className} object-contain`}
    />
  );
}
