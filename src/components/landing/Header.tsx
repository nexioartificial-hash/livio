import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border/40">
            <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative h-12 w-64 md:h-14 md:w-56">
                        <Image
                            src="/logo-transparent.png"
                            alt="Livio Logo"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </div>
                </Link>

                <nav className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-sm font-medium text-foreground/80 hover:text-accent transition-colors">
                        Funcionalidades
                    </Link>
                    <Link href="#pricing" className="text-sm font-medium text-foreground/80 hover:text-accent transition-colors">
                        Precios
                    </Link>
                    <Link href="#testimonials" className="text-sm font-medium text-foreground/80 hover:text-accent transition-colors">
                        Testimonios
                    </Link>
                </nav>

                <div className="flex items-center gap-4">
                    <Link href="/login" className="hidden sm:block text-sm font-medium text-foreground hover:text-accent transition-colors">
                        Ingresar
                    </Link>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-sm" asChild>
                        <Link href="/register">
                            Prueba gratis
                        </Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
