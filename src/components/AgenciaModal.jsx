import React, { useState, useRef, useEffect } from 'react';
import { X, Truck, Search, ChevronDown, ChevronUp, Check, Package } from 'lucide-react';

// ─── Listas Shalom ────────────────────────────────────────────────────────────

const SHALOM_ORIGEN = [
    "BAMBAMARCA", "CHACHAPOYAS CO DOS DE MAYO", "AV MEXICO CO", "JR. LUNA PIZARRO",
    "AV. LAS PALMERAS", "AV PARRA 379 CO", "ICA SAN JOAQUIN", "ANDAHUAYLAS",
    "CALLE EMAÚS", "CERRO DE PASCO", "CAJAMARCA CO", "JAUJA", "OVALO ORQUIDEAS CO",
    "ABANCAY", "BARRANCA", "AV ENRIQUE MEIGGS", "CUSCO PARQUE INDUSTRIAL",
    "SALAVERRY HUACHO CO", "ILO CO PAMPA INALAMBRICA", "AYACUCHO CO",
    "CAÑETE SAN VICENTE", "PROLONG LUIS MASSARO",
    "AV MARISCAL CASTILLA CO PARQUE INDUSTRIAL", "AV VICTOR R. HAYA CO",
    "CONCEPCION", "JR AGUILAR", "JAEN", "JR. MAMA OCLLO", "NUEVA CAJAMARCA",
    "AV COSTANERA", "SICUANI CO OVALO SAN ANDRES", "SULLANA SANTA ROSA",
    "TACNA CO AV. JORGE BASADRE", "TALARA  CO ASOC CALIFORNIA",
    "TARAPOTO CO JR ALFONSO UGARTE", "TUMBES - AV ARICA", "SAN ANTONIO",
    "JR. RAYMONDI", "AV SANTA ROSA URB LOS ALAMOS", "LAS CONCHITAS", "BAGUA GRANDE",
    "PEDRO RUIZ", "CHOTA", "IQUITOS JR FRANCISCO BOLOGNESI", "CALLERIA JR JOSE GALVEZ",
    "TINGO MARIA CO BUENOS AIRES", "AV ABRAHAM VALDELOMAR CO", "CHUPACA",
    "HUAYCAN ENTRADA", "AV. 13 DE ENERO", "AV UNIV.  RETABLO", "FIORI", "CHORRILLOS CO",
    "CALLAO FAUCETT", "PUENTE ARICA", "ESPINAR", "RIOJA", "LA CURVA DE MANCHAY",
    "AV  LA FONTANA", "CHEPEN", "PACASMAYO LAS PALMERAS", "AV. CESAR VALLEJO",
    "ATOCONGO", "CHULUCANAS", "SECHURA", "LA UNION", "CATACAOS", "PAITA", "MORROPON",
    "PARAD.  LOS LICENCIADOS", "AV. LA MARINA", "AV. CANTA CALLAO  CON ALISOS",
    "AV BERTELLO SMP", "CARABAYLLO ESTABLO", "AV  MARCO PUENTE", "REP. DE PANAMA",
    "CHAO", "PUENTE NUEVO", "OTUZCO", "HUAMACHUCO", "PAIJAN", "NUEVO LURIN",
    "AV VENEZUELA", "HUARAL", "HUARAZ", "CUTERVO", "AV CIRCUNVALACION NAZCA",
    "SAN JUAN DE MARCONA", "HUAYLLAY", "EL ALTO", "AGUAS VERDES", "LOS ORGANOS",
    "ZORRITOS", "AMBO", "FERREÑAFE", "SAN IGNACIO", "CIUDAD MUNICIPAL", "PARAMONGA",
    "ASOC LAS FLORES -  AV 54", "HUANTA", "CRUZ DE MOTUPE", "PLAZA LA TOMILLA",
    "AV PUMACAHUA", "HIGUERETA", "MÁNCORA", "MARIANO MELGAR", "AV SOCABAYA - LOS TORITOS",
    "MALA", "OLMOS", "MIRAFLORES CHICLAYO", "SJL- LAS FLORES", "MOTUPE", "CHANCAY",
    "MIRAFLORES AREQUIPA", "URB MANUEL PRADO", "SATIPO", "SAN RAMÓN", "LA MERCED",
    "PICHANAKI", "TARMA", "CHOSICA", "CHORRILLOS LOS FAISANES",
    "LAMBAYEQUE PANAMERICANA", "LA CINCUENTA", "AV NICOLAS DE PIEROLA  CDRA 4", "PRO",
    "RIMAC AV. AMANCAES", "OVALO DE LA FAMILIA", "AV. SAN FELIPE", "HUANCAYO JR. ICA",
    "HUARMEY", "MARISCAL NIETO", "PESQUERO", "MAGDALENA DEL MAR", "CALLE TAHUANTINSUYO",
    "CASMA", "AV. JOSE PARDO", "AV. PRIMAVERA 120", "SMP-AV. PROCERES", "TUMAN",
    "ZAPALLAL", "TAMBO GRANDE", "AV. LUIS EGUIGUREN", "PUENTE SANTA ANITA",
    "SAN JERONIMO", "AV. GRAU", "AV TAHUANTINSUYO", "AV HERMANOS ANGULO",
    "AV ANTONIO LORENA", "CHILCA HUANCAYO", "AV. LIMA - VMT",
    "HUAYCAN AV JOSE C MARIATEGUI", "LOS SAUCES", "AV TACNA",
    "MALVINAS - JR. RICARDO TRENEMAN", "PARQUE INDUSTRIAL CO PIURA FUTURA",
    "ANTA IZCUCHACA", "AV. PERU 15", "CAJAMARCA HORACIO ZEVALLOS",
    "AV. ANGELICA GAMARRA", "AV. TRAPICHE", "AÑO NUEVO", "TUNGASUCA",
    "JUANJUÍ FERNANDO BELAUNDE TERRY CO", "AV. CANADA", "YURIMAGUAS",
    "CUSCO URUBAMBA", "CHINCHERO", "QUILLABAMBA", "AVIACION 2819", "SJL-AV.PROCERES",
    "LA OROYA", "BARRIO SAN JOSE", "PLAZA NORTE S. EXPRESS", "TACALA", "MARIA AUXILIADORA",
    "BAÑOS DEL INCA", "AV HUANDOY CON MARAÑON", "PACANGUILLA", "AV. PASTOR SEVILLA",
    "PLAZA NORTE ENTREGAS", "HUANCAVELICA", "AV PACHACUTEC", "VILLA SAN FRANCISCO",
    "RIV. NAVARRETE", "CORPAC", "AV. ARENALES", "OXAPAMPA", "AV. ARAMBURU",
    "TAMBOPATA AV LA JOYA CO", "VILLA RICA", "MOLLENDO CO", "WICHANZAO",
    "AV. LIMA CDRA 38", "TUCUME", "AV  VIGIL", "CAMANA", "CERCADO MOLLENDO",
    "CALLE YARABAMBA", "SAN AGUSTIN DE CAJAS", "TRES DE OCTUBRE", "AV  JOSE GALVEZ",
    "MAZUKO", "AV  TUPAC AMARU KM. 19", "ALTO TRUJILLO", "CARAZ",
    "SULLANA CO ZONA INDUSTRIAL", "AV. CARLOS IZAGUIRRE CUADRA 23", "ILO PUERTO",
    "AV LARCO", "VELASCO ASTETE", "PUCALLPA CO FEDERICO BASADRE", "YARINACOCHA CENTRO",
    "PERENE", "CELENDIN", "TARAPOTO LA BANDA DE SHILCAYO", "LAMAS",
    "TARAPOTO JR. SARGENTO LOREZ", "JR LEONCIO PRADO", "SANTA", "LAS DELICIAS DE VILLA",
    "CARHUAZ", "TINGO MARÍA - LEONCIO PRADO", "CHACHAPOYAS JR GRAU", "PICOTA",
    "DESAGUADERO", "SAN MARTIN BELLAVISTA", "BELLAVISTA SULLANA", "YUNGAY", "CALLE LIMA",
    "ILAVE", "SANTA ROSA", "AYABACA", "SAN MARCOS", "CAJABAMBA", "BELLAVISTA CALLAO",
    "JESUS MARIA", "TUMBES PUYANGO", "PAIMAS", "SANTA CLARA", "ÓVALO MARIÁTEGUI",
    "01 DE MAYO", "AV. CANEVARO", "AV. VILLA MARIA", "AV MIGUEL GRAU  PAMPLONA ALTA",
    "SURCO MATEO PUMACAHUA", "AV. TUPAC AMARU KM. 23.5", "AV. DOS DE OCTUBRE",
    "AV. GERARDO UNGER CDRA 64", "GERMÁN AGUIRRE", "AV  ESPERANZA", "LAS LOMAS",
    "MALVINAS - JR. GARCIA VILLóN", "UCHUMAYO", "HUAURA", "AGUAYTÍA", "TRUJILLO LA PERLA",
    "ZARUMILLA", "AV. HUANCANE CDRA. 9", "LAS MERCEDES",
    "TUMBES CO - PANAMERICANA NORTE KM 2360", "TERMINAL LOS ANDES", "ICA SANTIAGO",
    "LA TINGUIÑA", "SALAS ICA", "ICA AV. JJ ELIAS", "CANTO GRANDE", "LOS PINOS",
    "AUCAYACU", "PARDO MIGUEL NARANJOS", "ICA URB. MANZANILLA", "CAÑETE IMPERIAL",
    "ATAHUALPA", "PUENTE VIRU", "HUANCABAMBA", "AV. CARLOS IZAGUIRRE CDRA. 14",
    "CIUDAD DE DIOS", "GUADALUPE LA LIBERTAD", "LOS FRESNOS", "AV FERNANDO BELAUNDE",
    "AV JOSE GRANDA CDRA 38", "AV. PRINCIPAL", "AV. ALFREDO BENAVIDES",
    "AV. COMANDANTE ESPINAR", "CALLE MIGUEL DASSO", "AYACUCHO JESÚS NAZARENO",
    "BAYOVAR", "SAN CARLOS HUANCAYO", "HUACHO AV  INDACOCHEA", "TACNA CIUDAD NUEVA",
    "AV LIMA", "MOCHE", "CUSCO CALCA", "AV  QUILCA", "LIMA AV TINGO MARÍA",
    "MEGAPLAZA CHORRILLOS", "RIMAC GUARDIA REPUBLICANA CDRA. 9", "CHINCHA PUEBLO NUEVO",
    "CAMPOY", "AV. HUAROCHIRÍ", "MAZAMARI", "AYAVIRI", "AV. DOMINICOS CDRA 14",
    "AV. ANGAMOS", "IQUITOS CO JR. PABLO ROSSELL", "PANGOA", "AV JOSE GRANDA CDRA. 25",
    "CORRALES", "PACHACÚTEC LUBRICANTES", "AV JOSE SACO ROJAS", "AV. LOS PLATINOS",
    "LUYA", "SANTA MARÍA DE HUACHIPA", "IGNACIO ESCUDERO", "AMARILIS CO",
    "LA VILLA  CRUCE PISCO", "JICAMARCA", "AV. LOS PESCADORES CO", "AV EL SOL",
    "JR. HUARAZ -  BREÑA", "PIMENTEL", "EL CRUCE LA JOYA", "MORROPE",
    "AV  SANTA ROSA - STA ANITA", "SAN CLEMENTE", "AV PARTICIPACION PARCELA",
    "OVALO LA PERLA", "AV. SAN LORENZO", "REAL PLAZA SALAVERRY", "JR. TAHUANTINSUYO",
    "AV  BALTA CDRA. 36", "ZAMACOLA", "AV CHARCANI", "AV LOS INCAS", "AZANGARO",
    "AV. CANTA CALLAO CON IZAGUIRRE", "AV AUGUSTO SALAZAR BONDY", "JR. RAMÓN CASTILLA",
    "CACHIMAYO - SAN SEBASTIAN", "COMBAPATA", "VIRU CENTRO", "AV. LAMPA", "AV. GULLMAN",
    "ILO PACOCHA", "JR. JAIME TRONCOSO", "VIA EXPRESA SUR", "SAYAN", "URCOS", "PISAC",
    "CIENEGUILLA KM. 14.5", "CALLE SANTA CRUZ - AMERICA SUR", "PACASMAYO CENTRO",
    "PUENTE LURIN", "AV. LA MOLINA CDRA. 35", "MEGAPLAZA INDEPENDENCIA",
    "AV. ARIAS ARAGUEZ", "URB. BANCOPATA AV. INDUSTRIAL", "AV. MODESTO BORDA",
    "SANTO DOMINGO", "AV. DEL MERCADO", "EL PROGRESO KM 22", "AV. UNIVERSITARIA CDRA. 16",
    "TICA TICA", "AV. MUNICIPAL", "AAHH SANTA ROSA PIURA", "SAN PEDRO DE LLOC",
    "AV  FLORA TRISTAN", "AV HUAROCHIRI ENVIOS", "SALCEDO", "PAMPA GRANDE TUMBES",
    "JAYANCA", "PIO  PATA", "QUEBRADA LAS LECHUZAS CO", "LA CRUZ  TUMBES",
    "JR CHINCHAYSUYO CDRA 4", "HUARACLLA", "HUAMBOCANCHA BAJA", "JACOBO HUNTER",
    "IBERIA", "SANTO TOMAS", "AV. LAS MAGNOLIAS", "OVALO HUANCHACO CO", "AV. CENTRAL",
    "AV. SANTA ROSA CRUCE AV. EL SOL", "GARATEA", "PARCONA", "JR  FREDY ALIAGA CO",
    "AUTOPISTA LA JOYA", "AV. PACÍFICO BELEN", "AV JESUS", "YURA",
    "AV. HORACIO ZEVALLOS", "UCHIZA", "JR. CAHUIDE", "ASOC. NUEVO HORIZONTE - AV. 54",
    "OVALO PUENTE PIEDRA", "AV HUANDOY CON AV CENTRAL", "AV TOMAS MARSANO - LA BOLICHERA",
    "JR CASANOVA CON PETIT THOUARS", "MANCHAY TRES MARIAS", "TEMBLADERA  CAJAMARCA",
    "CHALA", "AV BERTELLO CALLAO", "NUEVO IMPERIAL CO", "PILCOMAYO", "AV MANUEL VALLE",
    "AV  BOLIVAR", "CALLE A  CON AV INDUSTRIAL", "AV  SAN JUAN PAMPLONA ALTA",
    "AV CIRCUNVALACIÓN CRUCE CON MARIATEGUI", "AV JOSE LEAL CDRA 6",
    "SAN MIGUEL CAJAMARCA", "SAN PABLO  CAJAMARCA", "AV JOSE A. QUIÑONES",
    "AYACUCHO CARMEN ALTO", "AV HNOS UCEDA - AMERICA NORTE", "OROPESA", "ALTO PUNO",
    "TALARA ALTA 9 DE OCTUBRE", "MONSEFU", "AV SAENZ PEÑA", "AV LAS AMERICAS",
    "CALLE LOS ANGELES", "AV  INDEPENDENCIA", "PUNCHANA", "TALARA BAJA PARQUE 22",
    "SICUANI AV MANUEL CALLO", "ICA SUBTANJALLA CO", "MANANTAY  AV AGUAYTIA",
    "YARINACOCHA  AV UNIVERSITARIA", "MANANTAY AV TUPAC AMARU", "CALLERIA AV SAENZ PEÑA",
    "AV RAUL MATA LA CRUZ- DOS GRIFOS", "EL MILAGRO", "SORITOR", "SAN JOSE DE SISA",
    "TAMBOPATA AV CIRCUNVALACION", "LAMBAYEQUE CENTRO", "AV MALECON  CHECA CDRA. 1",
    "HUAYCAN  EL DESCANSO", "BAGUA CAPITAL", "JR AGUSTIN GAMARRA",
    "IQUITOS  AV TUPAC AMARU", "AV CIRCUNVALACION SJL", "NUEVA ESPERANZA VMT",
    "PUNTA HERMOSA", "AV TUPAC AMARU CDRA. 57", "URB SANTA ELVIRA", "SUPE", "CASA GRANDE",
    "OVALO PAPAL", "CIUDAD UNIVERSITARIA", "AV BUENOS AIRES", "HUAYCAN AV HORACIO ZEVALLOS",
    "SUNAMPE  CO", "MI PERU", "EL TRIUNFO", "MOYOBAMBA  CENTRO", "AV EJERCITO", "CHEN CHEN",
    "POCOLLAY", "JUANJUI  CENTRO", "REQUE", "CHONGOYAPE", "MATARANI", "POMALCA", "HUANCARO",
    "JIRON ANCASH", "COCACHACRA", "AV HEROES DEL PACIFICO CO", "SEGUNDA JERUSALEN",
    "PATAPO", "LARCOMAR", "PARQUE LA MOLINA", "APLAO", "CUSCO CO VIA EVITAMIENTO",
    "SAPOSOA", "VISTA ALEGRE CO", "ANT PANAM SUR CDRA 11", "AV COLONIZADORES  CO",
    "VIÑANIS", "CHALLHUAHUACHO", "MALL LAMBRAMANI",
];

const SHALOM_DESTINO = SHALOM_ORIGEN.filter(o =>
    o !== "JR. LUNA PIZARRO" && o !== "AV. SAN FELIPE" &&
    o !== "AV. JOSE PARDO" && o !== "AV. PRIMAVERA 120" &&
    o !== "RIV. NAVARRETE" && o !== "CORPAC" && o !== "AV. ARENALES" &&
    o !== "AV. ARAMBURU" && o !== "AV  FLORA TRISTAN" && o !== "AV HUAROCHIRI ENVIOS" &&
    o !== "AV. ALFREDO BENAVIDES" && o !== "AV. COMANDANTE ESPINAR" &&
    o !== "CALLE MIGUEL DASSO" && o !== "PLAZA NORTE S. EXPRESS"
);

const SHALOM_MERCADERIA = [
    "SOBRE", "PAQUETE XXS", "PAQUETE XS", "PAQUETE S", "PAQUETE M", "PAQUETE L", "CAJA", "BULTO",
];

// ─── Subcomponente: Select con búsqueda ───────────────────────────────────────

const SearchableSelect = ({ label, options, value, onChange, placeholder, icon: Icon }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef(null);
    const inputRef = useRef(null);

    const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

    useEffect(() => {
        const handleOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    return (
        <div className="flex flex-col gap-1.5" ref={ref}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => { setOpen(o => !o); setQuery(''); }}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 font-semibold text-sm
                        ${value ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-400 hover:border-blue-300'}`}
                >
                    <span className="flex items-center gap-2 truncate">
                        {Icon && <Icon size={15} className={value ? 'text-blue-500' : 'text-slate-300'} />}
                        <span className="truncate">{value || placeholder}</span>
                    </span>
                    {open ? <ChevronUp size={16} className="shrink-0 text-slate-400" /> : <ChevronDown size={16} className="shrink-0 text-slate-400" />}
                </button>

                {open && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-slate-100 ring-1 ring-black/5 flex flex-col overflow-hidden"
                        style={{ maxHeight: '260px' }}>
                        {/* Search input */}
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                            <Search size={14} className="text-slate-400 shrink-0" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Buscar..."
                                className="flex-1 text-sm bg-transparent outline-none text-slate-700 font-medium placeholder:text-slate-400"
                            />
                            {query && (
                                <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        {/* Options list */}
                        <div className="overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-slate-400 text-center">Sin resultados</div>
                            ) : filtered.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => { onChange(opt); setOpen(false); setQuery(''); }}
                                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between
                                        ${value === opt ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'}`}
                                >
                                    <span className="truncate">{opt}</span>
                                    {value === opt && <Check size={14} className="text-blue-500 shrink-0 ml-2" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Modal principal ──────────────────────────────────────────────────────────

const AgenciaModal = ({ onClose, onSave, pedidoId }) => {
    const [agencia, setAgencia] = useState(null); // 'shalom' | 'eva' | null
    const [origen, setOrigen] = useState('');
    const [destino, setDestino] = useState('');
    const [mercaderia, setMercaderia] = useState('');

    const [saving, setSaving] = useState(false);

    const canSave = agencia === 'shalom'
        ? origen && destino && mercaderia
        : agencia === 'eva';

    const handleSave = async () => {
        if (!canSave || saving) return;
        setSaving(true);
        try {
            await onSave({ agencia, origen, destino, mercaderia });
            onClose();
        } catch (err) {
            console.error('[AgenciaModal] Error al guardar:', err);
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)' }}>
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up-fade"
                style={{ maxHeight: '92vh' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-800 to-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                            <Truck size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Datos de Agencia</h2>
                            {pedidoId && <p className="text-xs text-white/50 font-medium">Pedido #{pedidoId}</p>}
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <X size={16} className="text-white" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">

                    {/* Selección de agencia */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agencia de envío</label>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Shalom */}
                            <button type="button" onClick={() => setAgencia('shalom')}
                                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all duration-200 font-bold text-sm
                                    ${agencia === 'shalom'
                                        ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-md shadow-amber-100'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:bg-amber-50/50'}`}>
                                <span className="text-2xl">🟡</span>
                                <span>SHALOM</span>
                                {agencia === 'shalom' && (
                                    <span className="text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full font-bold">Seleccionada</span>
                                )}
                            </button>

                            {/* EVA */}
                            <button type="button" onClick={() => setAgencia('eva')}
                                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all duration-200 font-bold text-sm
                                    ${agencia === 'eva'
                                        ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-md shadow-blue-100'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                                <span className="text-2xl">🔵</span>
                                <span>EVA</span>
                                {agencia === 'eva' && (
                                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">Seleccionada</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Campos Shalom */}
                    {agencia === 'shalom' && (
                        <div className="flex flex-col gap-4 animate-slide-up-fade">
                            <div className="h-px bg-slate-100" />
                            <SearchableSelect
                                label="Origen"
                                options={SHALOM_ORIGEN}
                                value={origen}
                                onChange={setOrigen}
                                placeholder="Selecciona el origen..."
                                icon={Truck}
                            />
                            <SearchableSelect
                                label="Destino"
                                options={SHALOM_DESTINO}
                                value={destino}
                                onChange={setDestino}
                                placeholder="Selecciona el destino..."
                                icon={Truck}
                            />
                            <SearchableSelect
                                label="Tipo de mercadería"
                                options={SHALOM_MERCADERIA}
                                value={mercaderia}
                                onChange={setMercaderia}
                                placeholder="Selecciona el tipo..."
                                icon={Package}
                            />
                        </div>
                    )}

                    {/* Mensaje EVA */}
                    {agencia === 'eva' && (
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-4 animate-slide-up-fade">
                            <span className="text-2xl">🔵</span>
                            <div>
                                <p className="font-bold text-blue-800 text-sm">EVA seleccionada</p>
                                <p className="text-xs text-blue-500 mt-0.5">Los campos de EVA se configurarán próximamente.</p>
                            </div>
                        </div>
                    )}

                    {!agencia && (
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                            <Truck size={18} className="text-slate-400" />
                            <p className="text-sm text-slate-500 font-medium">Selecciona una agencia para continuar.</p>
                        </div>
                    )}
                </div>

                {/* Footer / botones */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSave} disabled={!canSave || saving}
                        className={`flex-2 flex-grow-[2] py-3 rounded-xl font-black text-sm transition-all duration-200
                            ${canSave && !saving
                                ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg active:scale-[0.98]'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                        {saving ? 'Guardando...' : 'Guardar datos'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgenciaModal;
