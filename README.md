# DAO Governance System

Sistema de gobernanza descentralizada (DAO) con tokens ERC-20, staking, propuestas y votación on-chain.

## 🌐 Deployment en Sepolia

Los contratos ya están deployados y verificados en Sepolia testnet:

- **Token (DAOG)**: `0x3EeC1007885beBfA9a810121490dCD876edaa7eb`
- **DAO Contract**: `0x71d49935402aaab22F2c60123D63fe8Bd206dA7B`
- **Multisig Owner**: `0x93BeE6D64dbE516f1A0a988CDb85933967bc6A57`
- **Multisig Panic**: `0x1e1f0383CE5dA6F60e08Dcf2A4D29D10688884Fb`

[Ver contratos en Etherscan](https://sepolia.etherscan.io/address/0x71d49935402aaab22F2c60123D63fe8Bd206dA7B)

---

## 📋 Requisitos Previos

1. **Node.js** (versión LTS)
   - Descargar de: https://nodejs.org/
   - Verificar instalación: `node --version` y `npm --version`

2. **Metamask** (u otra wallet compatible)
   - Descargar extensión: https://metamask.io/
   - Configurar red Sepolia (activar "Show test networks")

3. **Sepolia ETH** (para gas fees)
   - Faucet utilizada: https://sepolia-faucet.pk910.de/ (Todas las demas o daban muy poco o necesitaban transacciones en la mainnet)

---

## 🚀 Instalación y Ejecución

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd DAO
```

### 2. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

### 3. Ejecutar el frontend

El archivo `.env` ya está incluido y configurado para conectarse a Sepolia.

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:5173`

---

## 🔑 Cuentas de Administración

### Multisig Owners (2/3 confirmaciones requeridas):

**Owner 1:**
- Address: `0xB35E992E30c75905031c95BdC8d8dd3Fda8fD812`
- Private Key: `aac309817a867b3ed64173172a90fc73805ca48501d161e23f9913f3acc9480e`

**Owner 2:**
- Address: `0xD02F42E9FA0224eE688f99bCfEDB8e600682F9A4`
- Private Key: `440f77b927067ae0920f5517b68301b9e8ad91aa22c08fedd6a27665f0c5805a`

**Owner 3:**
- Address: `0xed3fBfA06b1fb1a872B29e4298409CE726EAA037`
- Private Key: `2e03394f90684178f496c75f1b5c2fba265538f9e32e4ffcc876fe79b5528666`

### Importar cuentas en Metamask:

1. Abrir Metamask
2. Click en el menú (3 puntos) → "Add account or hardware wallet"
3. Seleccionar "Import account"
4. Pegar la private key
5. Repetir para las 3 cuentas (necesitas al menos 2 para aprobar transacciones del multisig)

---

## 💡 Cómo Usar la DAO

### 1. Dashboard - Comprar y Stakear Tokens

1. **Conectar Wallet** (botón arriba a la derecha)
2. **Comprar tokens DAOG**:
   - Ingresar cantidad de ETH
   - Click "Comprar Tokens"
   - Confirmar en Metamask

3. **Stakear tokens**:
   - **Para votar**: Stakear mínimo requerido
   - **Para proponer**: Stakear mínimo requerido (mayor que para votar)
   - Primera vez requiere 2 transacciones: approve + stake

### 2. Proposals - Crear y Votar Propuestas

1. **Crear propuesta**:
   - Necesitas tener stakeado el mínimo para proponer
   - Título y descripción
   - Opción de propuesta de Treasury (transferir ETH del balance de la DAO)
   - La propuesta durará el tiempo configurado (ej: 24 horas)

2. **Votar propuestas**:
   - Necesitas tener stakeado el mínimo para votar
   - A favor o En contra
   - Tu voting power se calcula según tus tokens stakeados
   - Solo puedes votar una vez por propuesta

3. **Finalizar propuestas**:
   - Cuando expira el tiempo, cualquiera puede finalizar
   - Se ejecuta automáticamente si fue aceptada

### 3. Admin Panel - Gestión de la DAO

**Solo owners del Multisig Owner pueden proponer estas acciones** (requieren 2/3 confirmaciones):

- **Mintear tokens** adicionales
- **Actualizar precio del token**
- **Cambiar requisitos de staking** (mínimos para votar/proponer)
- **Modificar parámetros**:
  - Lock time de staking
  - Duración de propuestas
  - Tokens por voting power
- **Transferir ownership** (¡PELIGROSO!)

### 4. Multisig Panel - Aprobar Transacciones

Ver y confirmar transacciones pendientes de los multisigs:
- **Multisig Owner**: Cambios administrativos
- **Multisig Panic**: Activar/desactivar modo pánico

Cada transacción necesita 2/3 confirmaciones para ejecutarse.

### 5. Panic Panel - Modo Emergencia

**Solo owners del Multisig Panic pueden activar** (requieren 2/3 confirmaciones):

- **Activar Pánico**: Pausa TODAS las operaciones de la DAO
- **Restaurar Tranquilidad**: Reactiva las operaciones

---

## 🏗️ Arquitectura del Proyecto

```
DAO/
├── contratos/                    # Smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── DAO.sol              # Contrato principal
│   │   ├── DAOToken.sol         # Token ERC-20
│   │   └── Multisig.sol         # Multisig wallet
│   ├── test/                    # Tests de Hardhat
│   ├── deployed-addresses-sepolia.json
│   └── hardhat.config.js
│
└── frontend/                    # Aplicación React
    ├── src/
    │   ├── contracts/           # ABIs y configuración
    │   │   ├── config.js
    │   │   ├── addresses.json
    │   │   ├── DAO.json
    │   │   ├── DAOToken.json
    │   │   └── Multisig.json
    │   ├── AdminPanel.jsx       # Panel de administración
    │   ├── MultisigPanel.jsx    # Gestión de multisigs
    │   ├── ProposalsPanel.jsx   # Crear/votar propuestas
    │   ├── PanicPanel.jsx       # Modo pánico
    │   ├── App.jsx              # Componente principal
    │   └── wagmi.js             # Configuración de wagmi
    └── package.json
```

---

## 🛠️ Tecnologías Utilizadas

### Smart Contracts:
- **Solidity** 0.8.28
- **Hardhat** - Framework de desarrollo
- **OpenZeppelin** - Contratos estándar (ERC-20, Ownable, ReentrancyGuard)

### Frontend:
- **React** - UI framework
- **Vite** - Build tool
- **Wagmi** - React hooks para Ethereum
- **Viem** - TypeScript interface para Ethereum
- **RainbowKit** - Wallet connection
- **Lucide React** - Iconos

### Infraestructura:
- **Alchemy** - RPC provider
- **Sepolia** - Ethereum testnet
- **Etherscan** - Block explorer

---

## 🧪 Testing

Los contratos incluyen tests completos con Hardhat:

```bash
cd contratos
npm install
npx hardhat test
```

Cobertura de tests: ~87% (requerido: 100% según especificación)

---

## 📝 Características Principales

### ✅ Gobernanza
- Sistema de propuestas on-chain
- Votación ponderada por tokens stakeados
- Duración configurable de propuestas
- Finalización automática al expirar

### ✅ Staking
- Stake separado para votar vs proponer
- Lock time configurable
- Voting power basado en tokens stakeados

### ✅ Seguridad
- Multisig para funciones administrativas (2/3)
- Modo pánico para emergencias
- ReentrancyGuard en todas las funciones críticas
- Contratos verificados en Etherscan

### ✅ Treasury
- Balance de ETH del DAO
- Propuestas para transferir fondos
- Aprobación por votación comunitaria

---

