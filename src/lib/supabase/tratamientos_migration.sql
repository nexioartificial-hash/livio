-- Create the treatments (tratamientos) table
CREATE TABLE IF NOT EXISTS public.tratamientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinic(id) ON DELETE CASCADE,
    categoria VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    duracion_min INTEGER DEFAULT 30,
    precio_promedio DECIMAL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tratamientos ENABLE ROW LEVEL SECURITY;

-- Policies (Assuming a professional is in the clinic)
CREATE POLICY "Tratamientos are viewable by clinic members" 
ON public.tratamientos FOR SELECT 
USING (
    clinic_id IN (
        SELECT clinic_id FROM public.professional WHERE id = auth.uid()
    )
);

CREATE POLICY "Tratamientos are insertable by clinic members" 
ON public.tratamientos FOR INSERT 
WITH CHECK (
    clinic_id IN (
        SELECT clinic_id FROM public.professional WHERE id = auth.uid()
    )
);

CREATE POLICY "Tratamientos are updatable by clinic members" 
ON public.tratamientos FOR UPDATE 
USING (
    clinic_id IN (
        SELECT clinic_id FROM public.professional WHERE id = auth.uid()
    )
);

CREATE POLICY "Tratamientos are deletable by clinic members" 
ON public.tratamientos FOR DELETE 
USING (
    clinic_id IN (
        SELECT clinic_id FROM public.professional WHERE id = auth.uid()
    )
);
