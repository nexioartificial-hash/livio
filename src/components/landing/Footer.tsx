import Link from "next/link";
import Image from "next/image";

export default function Footer() {
    return (
        <footer className="w-full border-t border-secondary/20 py-12 bg-white/30 backdrop-blur-md">
            <div className="container mx-auto px-4 flex flex-col items-center gap-6 md:flex-row md:justify-between text-sm text-muted-foreground">

                <div className="flex items-center gap-2">
                    <p>© 2026</p>
                    <Image
                        src="/logo-transparent.png"
                        alt="Livio"
                        width={60}
                        height={20}
                        className="h-4 w-auto object-contain inline-block"
                    />
                    <p>· Software para clínicas odontológicas argentinas.</p>
                </div>

                <nav className="flex gap-6">
                    <Link href="#" className="hover:underline hover:text-foreground">
                        Términos y Condiciones
                    </Link>
                    <Link href="/privacy" className="hover:underline hover:text-foreground">
                        Política de Privacidad
                    </Link>
                    <Link href="#" className="hover:underline hover:text-foreground">
                        Contacto
                    </Link>
                </nav>
            </div>
        </footer>
    );
}
