import Link from "next/link";

export default function SemEmpresaPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-8">
      <h1 className="text-xl font-semibold text-foreground">Sem empresa vinculada</h1>
      <p className="mt-2 max-w-md text-center text-muted-foreground">
        Sua conta ainda não está vinculada a nenhuma empresa. Entre em contato com o administrador ou acesse com outra conta.
      </p>
      <Link
        href="/onboarding"
        className="mt-4 rounded-lg bg-[#6366F1] px-4 py-2 text-white hover:bg-[#4F46E5]"
      >
        Criar empresa
      </Link>
      <Link
        href="/login"
        className="mt-6 rounded-lg border border-border px-4 py-2 text-muted-foreground hover:bg-muted/40"
      >
        Voltar ao login
      </Link>
    </main>
  );
}
