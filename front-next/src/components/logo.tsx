import Image from "next/image";

import logo from "../../public/softflyer-logo.png";

type LogoProps = {
  className?: string;
  priority?: boolean;
};

/** Logo oficial con fondo transparente (derivado de public/softlyer.png). */
export function Logo({ className = "h-12 w-auto", priority = false }: LogoProps) {
  return <Image src={logo} alt="Softflyer" priority={priority} className={className} />;
}
