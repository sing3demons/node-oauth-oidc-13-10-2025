// Export Repository Factory และ Repositories
export {
  UserRepository,
  ClientRepository, 
  AuthorizationCodeRepository,
  AccessTokenRepository,
  RefreshTokenRepository,
  RepositoryFactory
} from '../repositories/index.js';

// Export instances for backward compatibility with existing code
import { RepositoryFactory } from '../repositories/index.js';

export const UserModel = RepositoryFactory.getUserRepository();
export const ClientModel = RepositoryFactory.getClientRepository();
export const AuthCodeModel = RepositoryFactory.getAuthCodeRepository();
export const RefreshTokenModel = RepositoryFactory.getRefreshTokenRepository();