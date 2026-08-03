import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/auth.store'
import { useThemeStore } from '@/hooks/use-theme'

/**
 * Entrada do app: login e cadastro na mesma tela.
 *
 * O cadastro precisa de internet quando ha Neon configurado (para reservar o
 * e-mail); o login funciona offline se a conta ja foi usada nesta maquina.
 */
export function AuthPage(): React.JSX.Element {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const setTheme = useThemeStore((state) => state.setTheme)
  const [submitting, setSubmitting] = useState(false)

  const [login, setLogin] = useState({ email: '', password: '' })
  const [signup, setSignup] = useState({ name: '', email: '', password: '', confirm: '' })

  async function handleLogin(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await window.api.auth.login(login)
      setSession(result)
      setTheme(result.settings.theme)
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível entrar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignup(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (signup.password !== signup.confirm) {
      toast.error('As senhas não conferem.')
      return
    }

    setSubmitting(true)
    try {
      const result = await window.api.auth.register({
        name: signup.name,
        email: signup.email,
        password: signup.password
      })
      setSession(result)
      setTheme(result.settings.theme)
      toast.success(`Bem-vindo, ${result.user.name.split(' ')[0]}!`)
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a conta')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background flex h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Task Manager</h1>
            <p className="text-muted-foreground text-sm">
              Suas tarefas organizadas, online ou offline
            </p>
          </div>
        </div>

        <Tabs defaultValue="entrar">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entrar">Entrar</TabsTrigger>
            <TabsTrigger value="criar">Criar conta</TabsTrigger>
          </TabsList>

          <TabsContent value="entrar">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entrar na sua conta</CardTitle>
                <CardDescription>Use o e-mail e a senha que você cadastrou.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="username"
                      value={login.email}
                      onChange={(event) =>
                        setLogin((current) => ({ ...current, email: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={login.password}
                      onChange={(event) =>
                        setLogin((current) => ({ ...current, password: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="criar">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Criar uma conta</CardTitle>
                <CardDescription>
                  É preciso estar conectado à internet para criar a conta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="signup-name">Nome</Label>
                    <Input
                      id="signup-name"
                      value={signup.name}
                      onChange={(event) =>
                        setSignup((current) => ({ ...current, name: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="username"
                      value={signup.email}
                      onChange={(event) =>
                        setSignup((current) => ({ ...current, email: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      value={signup.password}
                      onChange={(event) =>
                        setSignup((current) => ({ ...current, password: event.target.value }))
                      }
                      required
                    />
                    <p className="text-muted-foreground text-xs">Mínimo de 6 caracteres.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-confirm">Confirmar senha</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={signup.confirm}
                      onChange={(event) =>
                        setSignup((current) => ({ ...current, confirm: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    Criar conta
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
