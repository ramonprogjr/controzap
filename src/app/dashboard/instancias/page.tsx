'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { manageInstance, createInstance, syncInstanceHistory } from '@/lib/supabase/edge-functions'
import { useToast } from '@/components/ui/ToastContainer'
import {
    Plus,
    QrCode,
    Trash2,
    RefreshCw,
    CheckCircle2,
    XCircle,
    X,
    ChevronRight,
    ChevronLeft,
    Check,
    ArrowRight,
    Eye,
    Settings2,
    Phone,
    Calendar,
    Zap,
    MoreVertical,
    Signal,
    SignalLow,
    ExternalLink,
    MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ZapSpinner } from '@/components/ui/ZapSpinner'

interface Instance {
    id: string
    company_id: string
    name: string
    phone: string
    uazapi_instance_id: string
    uazapi_instance_key: string
    status: 'connected' | 'disconnected' | 'connecting'
    qr_code?: string
    paircode?: string
    admin_field_01?: string
    admin_field_02?: string
    created_at: string
}

export default function InstanciasPage() {
    const [instances, setInstances] = useState<Instance[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [connecting, setConnecting] = useState<string | null>(null)

    // States for Create Sideover
    const [showCreateSideover, setShowCreateSideover] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [formData, setFormData] = useState({
        instanceName: '',
        adminField01: '',
        adminField02: '',
    })
    const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(null)
    const [qrCodeData, setQrCodeData] = useState<string | null>(null)

    // States for Details Sideover
    const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null)
    const [showDetailsSideover, setShowDetailsSideover] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [userRole, setUserRole] = useState<string | null>(null)
    const isAdmin = userRole?.toLowerCase() === 'admin'

    // States for custom Modals
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null) // instanceId
    const [showRenameModal, setShowRenameModal] = useState<{ id: string, name: string } | null>(null)
    const [newName, setNewName] = useState('')

    const toast = useToast()
    const supabase = createClient()

    const normalizeQrCode = (value?: string | null) => {
        if (!value) return null
        if (value.includes('base64,')) {
            return value.split('base64,')[1]
        }
        return value
    }

    const extractQrCode = (data: any) => {
        const raw =
            data?.qrcode?.base64 ||
            data?.instance?.qrcode?.base64 ||
            data?.instance?.qrcode ||
            data?.base64 ||
            data?.qr ||
            data?.qrcode
        return normalizeQrCode(raw)
    }

    const extractPairCode = (data: any) => {
        return (
            data?.paircode ||
            data?.instance?.paircode ||
            data?.instance?.pairCode ||
            data?.pairCode ||
            null
        )
    }

    const extractPhone = (data: any) => {
        const jid = data?.status?.jid || data?.instance?.jid || ''
        if (typeof jid === 'string' && jid.includes('@')) {
            return jid.split('@')[0]
        }
        return ''
    }

    const deriveStatus = (data: any): Instance['status'] => {
        const instanceStatus = data?.instance?.status
        if (instanceStatus === 'connected') return 'connected'
        if (instanceStatus === 'connecting') return 'connecting'
        if (instanceStatus === 'disconnected') return 'disconnected'

        const isConnected = data?.status?.connected
        if (isConnected === true) return 'connected'

        const hasQr = !!extractQrCode(data)
        return hasQr ? 'connecting' : 'disconnected'
    }

    useEffect(() => {
        loadInstances()
    }, [])

    const trySyncHistory = async (uazapiInstanceId: string) => {
        try {
            const result = await syncInstanceHistory(uazapiInstanceId)
            if (result?.imported > 0) {
                toast.success('Conversas sincronizadas', result.note || `${result.imported} mensagens importadas`)
            }
        } catch {
            /* histórico também chega via webhook */
        }
    }

    const loadInstances = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userData } = await supabase
                .from('users')
                .select('company_id, role')
                .eq('id', user.id)
                .single()

            if (!userData?.company_id) return
            setUserRole(userData.role)

            const { data, error } = await supabase
                .from('instances')
                .select('*')
                .eq('company_id', userData.company_id)
                .not('uazapi_instance_id', 'is', null)

            if (error) throw error

            const instancesWithStatus = await Promise.all(
                (data || []).map(async (instanceRow) => {
                    try {
                        const statusData = await manageInstance({
                            action: 'status',
                            instanceId: instanceRow.uazapi_instance_id,
                        })

                        const status = deriveStatus(statusData)
                        const phoneFromApi = extractPhone(statusData)

                        if (status === 'connected' && instanceRow.status !== 'connected') {
                            await supabase
                                .from('instances')
                                .update({
                                    status: 'connected',
                                    phone: phoneFromApi || instanceRow.phone || '',
                                })
                                .eq('id', instanceRow.id)
                            trySyncHistory(instanceRow.uazapi_instance_id)
                        }

                        return {
                            id: instanceRow.id,
                            company_id: instanceRow.company_id,
                            name: instanceRow.name,
                            phone: phoneFromApi || statusData.phone || instanceRow.phone || '',
                            uazapi_instance_id: instanceRow.uazapi_instance_id,
                            uazapi_instance_key: instanceRow.uazapi_instance_key || '',
                            status,
                            qr_code: extractQrCode(statusData),
                            admin_field_01: instanceRow.admin_field_01 || '',
                            admin_field_02: instanceRow.admin_field_02 || '',
                            created_at: instanceRow.created_at,
                        }
                    } catch {
                        return {
                            id: instanceRow.id,
                            company_id: instanceRow.company_id,
                            name: instanceRow.name,
                            phone: instanceRow.phone,
                            uazapi_instance_id: instanceRow.uazapi_instance_id,
                            uazapi_instance_key: instanceRow.uazapi_instance_key || '',
                            status: 'disconnected' as const,
                            admin_field_01: instanceRow.admin_field_01 || '',
                            admin_field_02: instanceRow.admin_field_02 || '',
                            created_at: instanceRow.created_at,
                        }
                    }
                })
            )

            setInstances(instancesWithStatus.filter(Boolean) as Instance[])
        } catch (err: any) {
            toast.error('Erro ao carregar instâncias', err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateInstance = async () => {
        if (instances.length >= 5) {
            toast.error('Limite atingido', 'Máximo de 5 instâncias por empresa')
            return
        }

        setCreating(true)
        try {
            const data = await createInstance({
                instanceName: formData.instanceName.trim(),
                adminField01: formData.adminField01.trim() || undefined,
                adminField02: formData.adminField02.trim() || undefined,
            })

            toast.success('Instância criada!', 'Abra os detalhes para gerar o QR Code')
            setShowCreateSideover(false)
            setCurrentStep(1)
            setFormData({ instanceName: '', adminField01: '', adminField02: '' })
            setCreatedInstanceId(null)
            setQrCodeData(null)

            const createdInstance: Instance = {
                id: data.instance.id,
                company_id: data.instance.company_id,
                name: data.instance.name,
                phone: data.instance.phone || '',
                uazapi_instance_id: data.instance.uazapi_instance_id,
                uazapi_instance_key: data.instance.uazapi_instance_key || '',
                status: (data.instance.status as Instance['status']) || 'connecting',
                qr_code: undefined,
                admin_field_01: data.instance.admin_field_01 || '',
                admin_field_02: data.instance.admin_field_02 || '',
                created_at: data.instance.created_at,
            }

            setSelectedInstance(createdInstance)
            setShowDetailsSideover(true)
            loadInstances()
        } catch (err: any) {
            toast.error('Erro ao criar instância', err.message)
        } finally {
            setCreating(false)
        }
    }

    const handleGenerateQRCode = async (instanceId: string) => {
        setConnecting(instanceId)
        try {
            const currentInstance =
                (selectedInstance?.uazapi_instance_id === instanceId ? selectedInstance : null) ||
                instances.find((instance) => instance.uazapi_instance_id === instanceId) ||
                null

            if (currentInstance && currentInstance.status !== 'disconnected') {
                await manageInstance({ action: 'disconnect', instanceId })
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }

            if (selectedInstance && selectedInstance.uazapi_instance_id === instanceId) {
                setSelectedInstance({ ...selectedInstance, qr_code: undefined, paircode: undefined, status: 'connecting' })
            }

            const result = await manageInstance({
                action: 'connect',
                instanceId,
            })

            // Tenta pegar o QR code de diferentes estruturas possíveis da UAZAPI
            // Agora incluindo result.instance?.qrcode conforme nova documentação
            let qrcode = extractQrCode(result)

            const paircode = extractPairCode(result)
            if (qrcode) {
                setQrCodeData(qrcode)
                // Se estiver com detalhes abertos, atualiza o selecionado também
                if (selectedInstance && selectedInstance.uazapi_instance_id === instanceId) {
                    setSelectedInstance({ ...selectedInstance, qr_code: qrcode, paircode, status: 'connecting' })
                }
            }

            // Se não veio no connect, tentar status com pequenas tentativas (QR pode demorar)
            if (!qrcode) {
                for (let attempt = 0; attempt < 5 && !qrcode; attempt++) {
                    await new Promise((resolve) => setTimeout(resolve, 1500))
                    const status = await manageInstance({ action: 'status', instanceId })
                    qrcode = extractQrCode(status)
                    if (!paircode) {
                        const updatedPairCode = extractPairCode(status)
                        if (updatedPairCode && selectedInstance && selectedInstance.uazapi_instance_id === instanceId) {
                            setSelectedInstance({ ...selectedInstance, paircode: updatedPairCode, status: 'connecting' })
                        }
                    }
                }

                if (qrcode) {
                    setQrCodeData(qrcode)
                    if (selectedInstance && selectedInstance.uazapi_instance_id === instanceId) {
                        setSelectedInstance({ ...selectedInstance, qr_code: qrcode, paircode, status: 'connecting' })
                    }
                } else {
                    toast.error(
                        'QR Code não disponível',
                        'A instância ainda está preparando o QR. Tente novamente em alguns segundos.'
                    )
                }
            }
        } catch (err: any) {
            toast.error('Erro ao gerar QR Code', err.message)
        } finally {
            setConnecting(null)
        }
    }

    const handleManageAction = async (instanceId: string, action: any, extraData: any = {}) => {
        try {
            const result = await manageInstance({
                action,
                instanceId,
                ...extraData
            })

            if (action === 'delete') {
                toast.success('Instância excluída', 'O registro foi removido com sucesso')
                setShowDetailsSideover(false)
            } else if (action === 'disconnect') {
                toast.success('Sessão encerrada', 'O WhatsApp foi desconectado com sucesso')
            } else if (action === 'updateName') {
                toast.success('Nome atualizado', 'A instância foi renomeada')
                if (selectedInstance) setSelectedInstance({ ...selectedInstance, name: extraData.name })
            } else if (action === 'presence') {
                toast.success('Status atualizado', `Modo ${extraData.presence === 'available' ? 'Online' : 'Invisível'} ativado`)
            } else if (action === 'privacy') {
                toast.success('Privacidade atualizada', 'As configurações foram salvas')
            } else if (action === 'updateAdminFields') {
                toast.success('Campos atualizados', 'Departamento e Responsável salvos')
            }

            loadInstances()
            return result
        } catch (err: any) {
            toast.error('Erro na operação', err.message)
            console.error('[Manage Action Error]', err)
        }
    }

    const handleFinishCreate = () => {
        setShowCreateSideover(false)
        setCurrentStep(1)
        setFormData({ instanceName: '', adminField01: '', adminField02: '' })
        setCreatedInstanceId(null)
        setQrCodeData(null)
        loadInstances()
    }

    const openDetails = (instance: Instance) => {
        setFormData({
            instanceName: instance.name,
            adminField01: instance.admin_field_01 || '',
            adminField02: instance.admin_field_02 || '',
        })
        setSelectedInstance(instance)
        setShowDetailsSideover(true)
    }

    return (
        <div className="p-8 min-h-screen animate-in fade-in duration-700">
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black heading-gradient mb-3 tracking-tighter">
                        Instâncias WhatsApp
                    </h1>
                    <p className="text-dim text-lg max-w-2xl font-medium">
                        Gerencie e monitore suas conexões em tempo real. Você pode ter até <span className="text-amber-500 font-black">5 instâncias</span> ativas simultaneamente.
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setShowCreateSideover(true)}
                        disabled={instances.length >= 5}
                        className="group relative flex items-center gap-3 bg-white text-slate-950 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all duration-300 shadow-2xl disabled:opacity-50 disabled:hover:scale-100 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <Plus className="w-5 h-5 relative z-10 group-hover:text-white transition-colors" strokeWidth={4} />
                        <span className="relative z-10 group-hover:text-white transition-colors">Nova Instância</span>
                    </button>
                )}
            </div>

            {loading && !instances.length ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-card-theme border border-card-theme rounded-3xl shadow-2xl group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent animate-pulse" />
                    <ZapSpinner size="xl" />
                    <p className="text-dim font-black uppercase tracking-widest animate-pulse relative z-10">Sincronizando com UAZAPI...</p>
                </div>
            ) : instances.length === 0 ? (
                <div className="relative group overflow-hidden bg-[var(--card)] border border-[var(--sidebar-border)] rounded-3xl p-16 text-center shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="w-64 h-64 text-amber-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="w-24 h-24 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/20 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                            <QrCode className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Pronto para começar?</h3>
                        <p className="text-[var(--text-secondary)] mb-10 max-w-md mx-auto text-lg leading-relaxed">
                            Conecte sua primeira instância e transforme seu WhatsApp em uma máquina de vendas automatizada.
                        </p>
                        {isAdmin ? (
                            <button
                                onClick={() => setShowCreateSideover(true)}
                                className="px-10 py-5 bg-gradient-to-r from-amber-600 to-amber-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-amber-500/40 transition-all duration-300 active:scale-95"
                            >
                                Conectar Primeiro Número
                            </button>
                        ) : (
                            <p className="text-[var(--text-secondary)] italic">Nenhuma instância vinculada à sua conta ainda.</p>
                        )}
                    </div>
                </div>
            ) : (
                /* Table View with Scroll support */
                <div className="bg-card-theme border border-card-theme rounded-[2.5rem] shadow-2xl overflow-hidden group">
                    <div className="max-h-[600px] overflow-auto scrollbar-hide">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-[var(--input-bg)]/50 border-b border-main sticky top-0 z-20 backdrop-blur-md">
                                    <th className="px-8 py-6 text-[10px] font-black text-dim uppercase tracking-[3px] w-[350px]">Instância</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Número</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Status</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Cadastro</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-dim uppercase tracking-[3px] text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-main">
                                {instances.map((instance) => (
                                    <tr
                                        key={instance.id}
                                        className="group/row hover:bg-white/[0.03] transition-colors duration-200"
                                    >
                                        <td className="px-8 py-6 max-w-[350px]">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg transition-all duration-300 group-hover/row:scale-110",
                                                    instance.status === 'connected'
                                                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                                        : "bg-[var(--input-bg)] text-dim border border-main"
                                                )}>
                                                    <Zap className="w-7 h-7" fill={instance.status === 'connected' ? "currentColor" : "none"} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-main font-black text-xl tracking-tight truncate">{instance.name}</p>
                                                    <p className="text-dim text-[10px] font-black uppercase tracking-[2px] truncate opacity-50">
                                                        UA-ID: {(() => {
                                                            const id = String(instance.uazapi_instance_id);
                                                            return id.startsWith('{') ? 'Sessão Ativa' : id.slice(0, 12).toUpperCase();
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-main font-bold font-mono">
                                                <Phone className="w-4 h-4 text-dim" />
                                                {instance.phone || <span className="text-dim opacity-30 italic font-medium">Sincronizando...</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={cn(
                                                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm",
                                                instance.status === 'connected'
                                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                    : instance.status === 'connecting'
                                                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"
                                                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                                            )}>
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    instance.status === 'connected' ? "bg-amber-400 shadow-[0_0_8px_rgba(255,105,0,0.5)]" :
                                                        instance.status === 'connecting' ? "bg-amber-400" : "bg-red-400"
                                                )} />
                                                {instance.status === 'connected' ? 'Ativo' : instance.status === 'connecting' ? 'Pendente' : 'Inativo'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-dim text-sm font-bold">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(instance.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openDetails(instance)}
                                                    className="px-4 py-2 bg-[var(--input-bg)] hover:bg-amber-500 text-main font-black text-[10px] uppercase tracking-[2px] hover:text-white rounded-xl transition-all duration-300 border border-transparent hover:border-amber-500 active:scale-95"
                                                >
                                                    Detalhes
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowDeleteModal(instance.uazapi_instance_id)}
                                                        title="Excluir instância"
                                                        className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all duration-300 border border-red-500/20 hover:border-red-500 active:scale-95"
                                                    >
                                                        <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sideover: Create Instance */}
            {showCreateSideover && (
                <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
                    <div
                        className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={handleFinishCreate}
                    />

                    <div className="relative w-full max-w-2xl bg-sidebar-theme border-l border-main shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
                        <div className="p-10 border-b border-main flex items-center justify-between bg-main/30">
                            <div>
                                <h2 className="text-3xl font-black text-main mb-2 tracking-tight">Nova Inteligência</h2>
                                <p className="text-dim font-medium italic">Configure um novo ponto de atendimento inteligente</p>
                            </div>
                            <button
                                onClick={handleFinishCreate}
                                className="p-4 hover:bg-[var(--hover-bg)] rounded-2xl text-dim hover:text-main transition-all border border-transparent hover:border-main shadow-inner"
                            >
                                <X className="w-8 h-8" />
                            </button>
                        </div>

                        {/* Stepper UI Progress */}
                        <div className="px-10 py-8 bg-white/[0.01] border-b border-white/5">
                            <div className="flex items-center justify-between relative">
                                <div className="absolute top-5 left-0 right-0 h-[3px] bg-main/20 z-0" />
                                {[1, 2, 3, 4].map((step, i) => (
                                    <div key={step} className="flex flex-col items-center gap-2 relative z-10">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all duration-500",
                                            currentStep >= step
                                                ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                                                : "bg-main/40 text-dim"
                                        )}>
                                            {currentStep > step ? <Check className="w-6 h-6" /> : step}
                                        </div>
                                    </div>
                                ))}
                                <div
                                    className="absolute top-5 left-0 h-[3px] bg-amber-500 transition-all duration-700 z-0"
                                    style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
                            {currentStep === 1 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-dim uppercase tracking-widest ml-1">Nome da Instância</label>
                                        <input
                                            type="text"
                                            autoFocus
                                            className="w-full input-theme rounded-2xl px-6 py-5 focus:ring-4 outline-none transition-all placeholder:text-dim/30 text-xl font-black"
                                            placeholder="Ex: Comercial_São_Paulo"
                                            value={formData.instanceName}
                                            onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
                                        />
                                        <p className="text-slate-500 text-sm ml-2 italic">Apenas letras, números e sublinhados.</p>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-dim uppercase tracking-widest ml-1">Departamento (Opcional)</label>
                                            <input
                                                type="text"
                                                className="w-full input-theme rounded-2xl px-6 py-4 text-main outline-none focus:ring-4 transition-all placeholder:text-dim/30 text-lg"
                                                placeholder="Ex: Vendas"
                                                value={formData.adminField01}
                                                onChange={(e) => setFormData({ ...formData, adminField01: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-dim uppercase tracking-widest ml-1">Responsável (Opcional)</label>
                                            <input
                                                type="text"
                                                className="w-full input-theme rounded-2xl px-6 py-4 text-main outline-none focus:ring-4 transition-all placeholder:text-dim/30 text-lg"
                                                placeholder="Ex: Lucas Gabriel"
                                                value={formData.adminField02}
                                                onChange={(e) => setFormData({ ...formData, adminField02: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 text-center py-6">
                                    <div className="relative group mx-auto inline-block">
                                        <div className="absolute -inset-4 bg-amber-500/10 blur-xl rounded-full opacity-100 transition-opacity" />
                                        <div className="relative bg-white p-8 rounded-[2rem] shadow-2xl border-8 border-main/20">
                                            {qrCodeData ? (
                                                <img src={`data:image/png;base64,${qrCodeData}`} alt="QR" className="w-64 h-64" />
                                            ) : (
                                                <div className="w-64 h-64 flex flex-col items-center justify-center bg-slate-100 rounded-3xl space-y-4">
                                                    <ZapSpinner size="md" />
                                                    <p className="text-slate-500 text-xs font-bold uppercase">Gerando Código...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4 max-w-sm mx-auto">
                                        <h4 className="text-2xl font-black text-main tracking-tight">Aponte sua câmera</h4>
                                        <p className="text-dim text-lg leading-relaxed font-medium">
                                            Vá em Dispositivos Conectados no seu WhatsApp e escaneie o código acima.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => createdInstanceId && handleGenerateQRCode(createdInstanceId)}
                                        className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-bold transition-colors bg-amber-500/10 px-6 py-3 rounded-2xl border border-amber-500/20"
                                    >
                                        <RefreshCw className="w-5 h-5" /> Regerar QR Code
                                    </button>
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="h-full flex flex-col items-center justify-center space-y-10 animate-in zoom-in duration-500 py-12">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-amber-500 blur-3xl opacity-20 rounded-full animate-pulse" />
                                        <div className="relative w-32 h-32 bg-amber-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-amber-600/30 rotate-12">
                                            <Check className="w-16 h-16 text-white" strokeWidth={4} />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-4">
                                        <h3 className="text-4xl font-black text-main tracking-tight">Excelente Trabalho!</h3>
                                        <p className="text-dim text-xl font-medium max-w-xs mx-auto leading-relaxed">
                                            Sua instância está configurada e pronta para operar 24/7.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-main bg-main/30 flex items-center justify-between">
                            <button
                                onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : handleFinishCreate()}
                                className="px-10 py-4 text-slate-500 font-bold hover:text-white transition-colors"
                            >
                                {currentStep === 1 ? 'Cancelar' : 'Voltar'}
                            </button>

                            <button
                                onClick={() => {
                                    if (currentStep === 1) setCurrentStep(2)
                                    else if (currentStep === 2) handleCreateInstance()
                                    else if (currentStep === 3) setCurrentStep(4)
                                    else handleFinishCreate()
                                }}
                                disabled={creating || (currentStep === 1 && !formData.instanceName.trim())}
                                className="group flex items-center gap-3 bg-amber-600 text-white px-12 py-4 rounded-2xl font-extrabold uppercase tracking-widest text-sm hover:bg-amber-500 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {creating ? <ZapSpinner size="sm" /> : (
                                    <>
                                        <span>{currentStep === 4 ? 'Concluir' : 'Continuar'}</span>
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sideover: Instance Details & Full Management */}
            {showDetailsSideover && selectedInstance && (
                <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
                    <div
                        className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={() => setShowDetailsSideover(false)}
                    />

                    <div className="relative w-full max-w-3xl bg-sidebar-theme border-l border-main shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out">
                        {/* Dynamic Status Header */}
                        <div className="relative h-64 flex-shrink-0 overflow-hidden">
                            <div className={cn(
                                "absolute inset-0 transition-all duration-700",
                                selectedInstance.status === 'connected'
                                    ? "bg-gradient-to-br from-amber-600/40 to-amber-900/60"
                                    : "bg-gradient-to-br from-red-600/30 to-slate-900"
                            )} />
                            <div className="absolute inset-0 backdrop-blur-md z-0" />

                            <div className="absolute top-8 left-10 right-10 flex justify-between items-start z-10">
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl border-2 rotate-12 transition-all duration-500",
                                        selectedInstance.status === 'connected'
                                            ? "bg-amber-500 text-white border-white/20"
                                            : "bg-[var(--input-bg)] text-dim border-main"
                                    )}>
                                        <Zap className="w-10 h-10" fill={selectedInstance.status === 'connected' ? "currentColor" : "none"} />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black text-white leading-none mb-2 tracking-tight">{selectedInstance.name}</h2>
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[2px] border",
                                                selectedInstance.status === 'connected'
                                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                                    : "bg-[var(--input-bg)] text-dim border-main shadow-sm"
                                            )}>
                                                {selectedInstance.status === 'connected' ? 'On-line' : 'Off-line'}
                                            </span>
                                            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{selectedInstance.id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => loadInstances()}
                                        className="p-4 bg-white/10 hover:bg-amber-500/20 rounded-2xl text-white transition-all backdrop-blur-md border border-white/10 active:scale-90 group"
                                        title="Atualizar Status"
                                    >
                                        <RefreshCw className={cn("w-6 h-6", loading && "animate-spin")} />
                                    </button>
                                    <button
                                        onClick={() => setShowDetailsSideover(false)}
                                        className="p-4 bg-white/10 hover:bg-red-500/20 rounded-2xl text-white transition-all backdrop-blur-md border border-white/10 active:scale-90"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 -mt-16 relative z-10 space-y-10 scrollbar-hide">
                            {/* Main Info Card */}
                            <div className="bg-main/30 border border-main rounded-3xl p-10 shadow-2xl grid grid-cols-2 gap-10">
                                <div className="space-y-2">
                                    <p className="text-dim font-black uppercase tracking-[2px] text-[10px]">Número de Telefone</p>
                                    <p className="text-main text-2xl font-black font-mono tracking-tight flex items-center gap-3">
                                        <Phone className="w-7 h-7 text-amber-500" />
                                        {selectedInstance.phone || <span className="text-dim opacity-30 italic font-medium">Sincronizando...</span>}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-dim font-black uppercase tracking-[2px] text-[10px]">Primeiro Registro</p>
                                    <p className="text-main text-xl font-black flex items-center gap-3">
                                        <Calendar className="w-6 h-6 text-amber-500" />
                                        {new Date(selectedInstance.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <div className="col-span-2 pt-4 border-t border-main grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <p className="text-dim font-black uppercase tracking-[2px] text-[10px]">Departamento</p>
                                        <input
                                            type="text"
                                            value={formData.adminField01}
                                            onChange={(e) => setFormData({ ...formData, adminField01: e.target.value })}
                                            placeholder="Ex: Vendas"
                                            className="w-full input-theme rounded-xl px-4 py-2 text-sm font-bold shadow-inner"
                                            onBlur={(e) => handleManageAction(selectedInstance.uazapi_instance_id, 'updateAdminFields', { adminField01: e.target.value, adminField02: formData.adminField02 })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-dim font-black uppercase tracking-[2px] text-[10px]">Responsável</p>
                                        <input
                                            type="text"
                                            value={formData.adminField02}
                                            onChange={(e) => setFormData({ ...formData, adminField02: e.target.value })}
                                            placeholder="Nome do operador"
                                            className="w-full input-theme rounded-xl px-4 py-2 text-sm font-bold shadow-inner"
                                            onBlur={(e) => handleManageAction(selectedInstance.uazapi_instance_id, 'updateAdminFields', { adminField01: formData.adminField01, adminField02: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Presence & Availability */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-dim uppercase tracking-widest flex items-center gap-3 ml-2">
                                    <Signal className="w-4 h-4 text-amber-500" /> Presença e Disponibilidade
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleManageAction(selectedInstance.uazapi_instance_id, 'presence', { presence: 'available' })}
                                        className="p-6 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-3xl text-left transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <p className="text-main font-black text-lg">Modo Online</p>
                                        <p className="text-dim text-xs font-medium">Exibe "Disponível" para todos</p>
                                    </button>
                                    <button
                                        onClick={() => handleManageAction(selectedInstance.uazapi_instance_id, 'presence', { presence: 'unavailable' })}
                                        className="p-6 bg-main/20 hover:bg-main/40 border border-main rounded-3xl text-left transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-main text-dim rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <XCircle className="w-5 h-5" />
                                        </div>
                                        <p className="text-main font-black text-lg">Modo Invisível</p>
                                        <p className="text-dim text-xs font-medium">Oculta status para terceiros</p>
                                    </button>
                                </div>
                            </div>

                            {/* Section: Privacy Quick Controls */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-dim uppercase tracking-widest flex items-center gap-3 ml-2">
                                    <Settings2 className="w-4 h-4 text-amber-500" /> Privacidade da Conta
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { label: 'Visto por Último', key: 'last', value: 'contacts' },
                                        { label: 'Foto de Perfil', key: 'profile', value: 'all' },
                                        { label: 'Recibo de Leitura', key: 'readreceipts', value: 'all' }
                                    ].map((item) => (
                                        <div key={item.key} className="p-5 bg-main/20 border border-main rounded-2xl flex items-center justify-between hover:bg-main/40 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center font-bold">
                                                    {item.label[0]}
                                                </div>
                                                <p className="text-main font-black">{item.label}</p>
                                            </div>
                                            <select
                                                className="input-theme text-xs font-black p-2 rounded-lg outline-none focus:ring-4 transition-all"
                                                onChange={(e) => handleManageAction(selectedInstance.uazapi_instance_id, 'privacy', { privacy: { [item.key]: e.target.value } })}
                                            >
                                                <option value="all">Todos</option>
                                                <option value="contacts">Contatos</option>
                                                <option value="none">Ninguém</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section: QR Code (Only if disconnected) */}
                            {selectedInstance.status !== 'connected' && (
                                <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-3xl p-10 text-center space-y-8 animate-in zoom-in-95">
                                    <div className="bg-white p-6 rounded-2xl inline-block shadow-2xl border-4 border-main/20">
                                        {selectedInstance.qr_code ? (
                                            <div className="space-y-4">
                                                <img src={`data:image/png;base64,${selectedInstance.qr_code}`} alt="QR" className="w-56 h-56" />
                                                {(selectedInstance as any).paircode && (
                                                    <div className="mt-4 p-4 bg-main/20 rounded-xl border-2 border-dashed border-main">
                                                        <p className="text-[10px] font-black text-dim uppercase mb-1">Código de Pareamento</p>
                                                        <p className="text-2xl font-black text-main tracking-widest">{(selectedInstance as any).paircode}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : connecting === selectedInstance.uazapi_instance_id ? (
                                            <div className="w-56 h-56 flex flex-col items-center justify-center bg-main/20 rounded-2xl space-y-4 border border-main border-dashed">
                                                <ZapSpinner size="md" />
                                                <p className="text-dim text-[10px] font-black uppercase tracking-widest">Gerando Código...</p>
                                            </div>
                                        ) : (
                                            <div className="w-56 h-56 flex flex-col items-center justify-center bg-main/10 rounded-xl space-y-4">
                                                <ZapSpinner size="md" />
                                                <p className="text-dim text-[10px] font-black uppercase tracking-widest">Iniciando...</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-2xl font-black text-main tracking-tight">Pareamento Pendente</h4>
                                        <p className="text-dim font-medium">Escaneie para ativar a monitoração em tempo real.</p>
                                    </div>
                                    <button
                                        onClick={() => handleGenerateQRCode(selectedInstance.uazapi_instance_id)}
                                        className="w-full bg-main text-reverse py-5 rounded-2xl font-black text-lg hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                        {selectedInstance.qr_code ? 'Regerar Código QR' : 'Gerar Código QR'}
                                    </button>
                                </div>
                            )}

                            {/* Section: Advanced Actions */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-dim uppercase tracking-widest flex items-center gap-3 ml-2">
                                    <RefreshCw className="w-4 h-4 text-amber-500" /> Manutenção e Sessão
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleManageAction(selectedInstance.uazapi_instance_id, 'disconnect')}
                                        className="p-5 bg-card-theme border border-main rounded-2xl text-left hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group shadow-sm hover:shadow-md"
                                    >
                                        <RefreshCw className="w-6 h-6 text-amber-500 mb-3 group-hover:rotate-180 transition-transform duration-700" />
                                        <p className="text-main font-bold">Desconectar</p>
                                        <p className="text-dim text-[10px]">Encerra sessão atual</p>
                                    </button>
                                    {selectedInstance.status === 'connected' && (
                                    <button
                                        onClick={() => trySyncHistory(selectedInstance.uazapi_instance_id)}
                                        className="p-5 bg-card-theme border border-main rounded-2xl text-left hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group shadow-sm hover:shadow-md"
                                    >
                                        <MessageSquare className="w-6 h-6 text-amber-500 mb-3" />
                                        <p className="text-main font-bold">Sincronizar conversas</p>
                                        <p className="text-dim text-[10px]">Importa histórico recente</p>
                                    </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            setNewName(selectedInstance.name)
                                            setShowRenameModal({ id: selectedInstance.uazapi_instance_id, name: selectedInstance.name })
                                        }}
                                        className="p-5 bg-card-theme border border-main rounded-2xl text-left hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group shadow-sm hover:shadow-md"
                                    >
                                        <Settings2 className="w-6 h-6 text-amber-500 mb-3 group-hover:scale-125 transition-transform" />
                                        <p className="text-main font-bold">Renomear</p>
                                        <p className="text-dim text-[10px]">Alterar apelido</p>
                                    </button>
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="pt-10 border-t border-white/5">
                                    <button
                                        onClick={() => setShowDeleteModal(selectedInstance.uazapi_instance_id)}
                                        disabled={isDeleting}
                                        className="w-full group relative overflow-hidden p-6 border-2 border-red-500/20 text-red-500 rounded-[2rem] font-black text-lg transition-all hover:text-white bg-card-theme hover:border-red-600"
                                    >
                                        <div className="absolute inset-0 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 ease-out z-0" />
                                        <div className="relative z-10 flex items-center justify-center gap-3">
                                            {isDeleting ? <ZapSpinner size="sm" /> : <Trash2 className="w-6 h-6" />}
                                            <span>Excluir Instância Permanentemente</span>
                                        </div>
                                    </button>
                                    <p className="text-center text-dim text-[10px] mt-4 font-bold uppercase tracking-widest">Atenção: Esta ação não pode ser desfeita e removerá todos os logs associados.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-xl" onClick={() => setShowDeleteModal(null)} />
                    <div className="relative bg-card-theme border border-main p-12 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] max-w-lg w-full text-center space-y-10 animate-in zoom-in-95 duration-300">
                        <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-red-500/20 mb-4">
                            <Trash2 className="w-12 h-12 text-red-500" />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black text-main tracking-tight">Excluir Instância?</h3>
                            <p className="text-dim text-lg leading-relaxed font-medium">
                                Esta ação é irreversível. Todas as configurações e conexões deste vendedor serão removidas permanentemente.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                className="p-5 bg-[var(--input-bg)] text-dim font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-[var(--hover-bg)] transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    setIsDeleting(true)
                                    await handleManageAction(showDeleteModal, 'delete')
                                    setIsDeleting(false)
                                    setShowDeleteModal(null)
                                }}
                                className="p-5 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-red-500 shadow-2xl shadow-red-600/20 transition-all active:scale-95"
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Rename Prompt Modal */}
            {showRenameModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-xl" onClick={() => setShowRenameModal(null)} />
                    <div className="relative bg-card-theme border border-main p-12 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] max-w-lg w-full space-y-10 animate-in zoom-in-95 duration-300">
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black text-main tracking-tight">Renomear Instância</h3>
                            <p className="text-dim font-medium italic">Escolha um novo apelido identificador para esta conexão.</p>
                        </div>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Ex: Comercial_Novo"
                            className="w-full input-theme rounded-2xl px-6 py-5 text-2xl font-black shadow-inner"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newName.trim()) {
                                    handleManageAction(showRenameModal.id, 'updateName', { name: newName.trim() })
                                    setShowRenameModal(null)
                                }
                            }}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowRenameModal(null)}
                                className="p-5 bg-white/5 text-slate-400 font-bold rounded-2xl hover:bg-white/10 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={!newName.trim()}
                                onClick={() => {
                                    handleManageAction(showRenameModal.id, 'updateName', { name: newName.trim() })
                                    setShowRenameModal(null)
                                }}
                                className="p-5 bg-amber-600 text-white font-black rounded-2xl hover:bg-amber-500 shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
