import DAOArtifact from './DAO.json';
import TokenArtifact from './DAOToken.json';
import addresses from './addresses.json';

export const DAO_ADDRESS = addresses.dao;
export const TOKEN_ADDRESS = addresses.token;
export const MULTISIG_OWNER_ADDRESS = addresses.multisigOwner;
export const MULTISIG_PANIC_ADDRESS = addresses.multisigPanic;

export const DAO_ABI = DAOArtifact.abi;
export const TOKEN_ABI = TokenArtifact.abi;

export const ACCOUNTS = addresses.accounts;