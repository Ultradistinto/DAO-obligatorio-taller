# DAO Governance - Setup y Progreso

## 📋 Estado Actual del Proyecto

### ✅ Completado
- Smart contracts básicos (DAOToken, SimpleMultiSig, DAO)
- Sistema de pánico/tranquilidad
- Compra de tokens con ETH
- Sistema de staking (para votar y para proponer)
- Frontend básico con RainbowKit + Wagmi
- Conexión MetaMask funcionando
- Deploy local en Hardhat Network

### ⏳ Pendiente
- Sistema de propuestas y votación
- Treasury (Conjunto C) - propuestas que transfieren ETH
- Tests con 100% coverage
- Deploy a Sepolia testnet
- Backend para indexar eventos (opcional)
- Documentación completa
- Video demo

---

## 🏗️ Arquitectura del Proyecto

DAO/
├── contratos/              # Smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── DAOToken.sol   # Token ERC-20
│   │   ├── SimpleMultiSig.sol  # Wallet multisig
│   │   └── DAO.sol        # Contrato principal
│   ├── scripts/
│   │   └── deploy.js      # Script de deployment
│   ├── test/              # Tests (pendiente)
│   └── hardhat.config.js  # Config con Chain ID 1337
│
├── frontend/              # React + Vite
│   ├── src/
│   │   ├── contracts/     # ABIs y addresses
│   │   ├── wagmi.js       # Configuración Web3
│   │   ├── App.jsx        # Componente principal
│   │   └── main.jsx       # Entry point
│   └── package.json
│
└── docs/                  # Documentación (crear después)

---

## 🚀 Cómo Correr el Proyecto

### Prerequisitos
- Node.js instalado
- MetaMask en el navegador
- Git

### 1. Levantar Blockchain Local

**Terminal 1:**
```bash
cd C:\Users\larro\Desktop\DAO\contratos
npx hardhat node

Esto inicia Hardhat Network en http://127.0.0.1:8545 con Chain ID 1337.

Deja esta terminal corriendo.

2. Deployar Contratos

Terminal 2:
cd C:\Users\larro\Desktop\DAO\contratos
npx hardhat run scripts/deploy.js --network localhost

Esto deploya:
- DAOToken
- 2 Multisigs (Owner y Panic)
- DAO (con pánico configurado)

Guarda las addresses en deployed-addresses.json.

3. Copiar ABIs al Frontend

cd C:\Users\larro\Desktop\DAO\frontend
copy ..\contratos\artifacts\contracts\DAO.sol\DAO.json src\contracts\DAO.json
copy ..\contratos\artifacts\contracts\DAOToken.sol\DAOToken.json src\contracts\DAOToken.json
copy ..\contratos\deployed-addresses.json src\contracts\addresses.json

4. Correr Frontend

Terminal 3:
cd C:\Users\larro\Desktop\DAO\frontend
npm run dev

Abre http://localhost:5173

---
🦊 Configurar MetaMask

Agregar Red Local

1. MetaMask → Selector de redes → "Add network" → "Add manually"
2. Llenar:
- Network Name: Localhost 8545
- RPC URL: http://127.0.0.1:8545
- Chain ID: 1337 ⚠️ (importante: 1337, no 31337)
- Currency Symbol: ETH
3. Save

Importar Cuenta de Prueba

1. En la terminal de Hardhat node, copia la Private Key de Account #0:
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
2. MetaMask → Ícono circular → "Import Account"
3. Pega la private key
4. Deberías ver ~10,000 ETH

Conectar

1. En MetaMask, selecciona la red "Localhost 8545"
2. En el frontend, clic en "Connect Wallet"
3. Selecciona MetaMask y aprueba

---
📝 Contratos - Funcionalidades Implementadas

DAOToken.sol

- constructor() // Inicia con 0 tokens
- mint(address, uint256) onlyOwner // Mintear tokens
// Hereda de ERC20: transfer, balanceOf, approve, etc.

SimpleMultiSig.sol

- constructor(owners[], required) // Ej: 3 owners, 2 required
- submitTransaction(to, value, data) // Proponer tx
- confirmTransaction(txId) // Confirmar tx
- executeTransaction(txId) // Ejecutar si tiene confirmaciones

DAO.sol

Sistema de Pánico:
- setPanicWallet(address) onlyOwner // Configurar panic wallet
- panic() onlyPanicWallet // Pausar DAO
- tranquilidad() onlyPanicWallet // Reanudar DAO

Compra de Tokens:
- buyTokens() payable // Envía ETH, recibe tokens

Staking:
- stakeForVoting(amount) // Stakear para votar
- stakeForProposing(amount) // Stakear para proponer
- unstakeFromVoting(amount) // Retirar después del lockTime
- unstakeFromProposing(amount) // Retirar después del lockTime

View Functions:
- getStakeInfo(address) // Ver staking de usuario
- calculateVotingPower(address) // Calcular poder de voto

Owner Functions:
- updateTokenPrice(uint256)
- updateMinStakeToVote(uint256)
- updateMinStakeToPropose(uint256)

---
🎯 Parámetros de la DAO (configurados en deploy)

tokenPrice = 0.001 ETH por token
tokensPerVP = 1000 tokens = 1 Voting Power
minStakeToVote = 100 tokens
minStakeToPropose = 500 tokens
stakingLockTime = 300 segundos (5 minutos)
proposalDuration = 600 segundos (10 minutos)

---
🐛 Problemas Comunes y Soluciones

Error: "Chain ID mismatch"

Causa: Hardhat y MetaMask tienen Chain IDs diferentes.

Solución: Asegúrate que:
- hardhat.config.js tiene chainId: 1337
- MetaMask está en red con Chain ID 1337
- wagmi.js usa chain con ID 1337

Reinicia Hardhat node después de cambiar config.

Error: "DAO is paused"

Causa: DAO inicia pausada hasta que se configure panic wallet.

Solución: El script de deploy ya configura el panic wallet automáticamente. Si re-deployas manualmente, asegúrate de llamar setPanicWallet().

Frontend se desconecta al conectar wallet

Causa: Chain ID mismatch entre wagmi config y MetaMask.

Solución: Verifica que todos usen Chain ID 1337.

No aparece el balance de tokens

Causa: Los ABIs no están copiados o las addresses son incorrectas.

Solución: Re-copia los archivos del paso 3 ("Copiar ABIs al Frontend").

---
📦 Dependencias Importantes

Contratos

{
"hardhat": "^2.22.0",
"@nomicfoundation/hardhat-toolbox": "latest",
"@openzeppelin/contracts": "latest"
}

Frontend

{
"wagmi": "2.12.17",
"viem": "2.21.19",
"@rainbow-me/rainbowkit": "2.1.6",
"@tanstack/react-query": "5.59.16"
}

⚠️ Importante: Estas versiones son compatibles entre sí. No actualizar sin verificar compatibilidad.

---
🔄 Flujo de Desarrollo

Modificar Contratos

1. Editar archivos en contratos/contracts/
2. Compilar: npx hardhat compile
3. Reiniciar Hardhat node (Ctrl+C, luego npx hardhat node)
4. Re-deployar: npx hardhat run scripts/deploy.js --network localhost
5. Copiar ABIs al frontend (paso 3 de "Cómo Correr")
6. Recargar frontend (F5)

Modificar Frontend

1. Editar archivos en frontend/src/
2. Vite hace hot-reload automático
3. Refrescar navegador si es necesario

---
📚 Próximos Pasos para Completar el Obligatorio

1. Sistema de Propuestas (prioridad alta)

En DAO.sol:
- createProposal(title, description) - Crear propuesta normal
- createTreasuryProposal(title, desc, target, amount) - Propuesta treasury
- vote(proposalId, bool) - Votar a favor/contra
- executeProposal(proposalId) - Ejecutar propuesta aprobada
- getProposal(proposalId) - Ver detalle de propuesta
- getAllProposals() - Ver todas las propuestas

En Frontend:
- Componente para crear propuestas
- Lista de propuestas con filtros (ACTIVAS, RECHAZADAS, ACEPTADAS)
- Componente para votar
- Mostrar detalles de propuesta (votos, quiénes votaron)

2. Tests (CRÍTICO - requisito del obligatorio)

- Test coverage 100% (excepto contratos de prueba)
- Casos borde
- Prevención de ataques:
- Reentrancy
- Integer overflow/underflow (Solidity 0.8+ lo previene)
- Access control
- Front-running (en propuestas)

Herramientas:
npx hardhat test
npx hardhat coverage

3. Deploy a Testnet (Sepolia)

- Obtener Sepolia ETH (faucets)
- Configurar .env con private keys
- Deploy a Sepolia
- Verificar contratos en Etherscan
- Actualizar frontend para usar Sepolia

4. Documentación

- Arquitectura completa
- Diagrama de contratos y responsabilidades
- Aspectos asumidos
- Desafíos encontrados
- Guía de instalación (para el profesor)
- Guía de testing

5. Video Demo

- Mostrar todas las funcionalidades
- Mostrar transacciones en blockchain
- Mostrar al menos una interacción con multisig

---
🎓 Conjunto de Funcionalidades: Conjunto C (Treasury)

Propuestas especiales que pueden transferir ETH del treasury de la DAO.

Requisitos:
- Propuesta incluye address destino y uint256 cantidad (en WEI)
- Si propuesta se aprueba, transferir automáticamente
- En executeProposal(), verificar si es tipo TREASURY y ejecutar transfer

Implementación sugerida:
if (proposal.proposalType == ProposalType.TREASURY) {
    require(address(this).balance >= proposal.treasuryAmount, "Insufficient treasury");
    proposal.treasuryTarget.transfer(proposal.treasuryAmount);
    emit TreasuryTransferExecuted(proposalId, proposal.treasuryTarget, proposal.treasuryAmount);
}

---
💡 Notas Adicionales

Owner vs Multisig

- El owner del DAO es el contrato Multisig Owner
- Para acciones de owner (mintear tokens, cambiar parámetros), usar multisig
- El deployer transfiere ownership al multisig en el deploy

Panic Wallet

- Es un segundo multisig separado
- Solo puede llamar panic() y tranquilidad()
- NO puede cambiar parámetros ni mintear tokens

Staking Separado

- Tokens para votar ≠ Tokens para proponer
- Si usuario quiere ambos, debe hacer 2 stakings
- Cada uno tiene su propio lockTime

Voting Power

- VP = tokens_staked / tokensPerVotingPower
- Ejemplo: 10,000 tokens staked / 1,000 = 10 VP
- El voto cuenta como 10 votos

---
🔗 Links Útiles

- https://hardhat.org/docs
- https://docs.openzeppelin.com/contracts
- https://wagmi.sh/
- https://www.rainbowkit.com/docs
- https://viem.sh/
- https://sepoliafaucet.com/
- https://sepolia.etherscan.io/

---
✅ Checklist Pre-Entrega

- Todas las funcionalidades implementadas
- Test coverage 100%
- Contratos deployados en Sepolia
- Contratos verificados en Etherscan
- Frontend funcionando con Sepolia
- Documentación completa (arquitectura, diagramas, etc.)
- Guía de instalación paso a paso
- Video demo completo
- README.md con instrucciones claras
- Código en GitHub
- Segunda wallet (además de MetaMask) funcionando

---
Fecha de entrega: 26/6/2025
Defensa: A definir

---
Última actualización: 21/11/2025
Estado: Fase 1 completada - Base funcional lista