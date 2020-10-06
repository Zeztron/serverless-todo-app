import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda'
import 'source-map-support/register'

import { verify } from 'jsonwebtoken'
import { createLogger } from '../../utils/logger'
import Axios from 'axios'
import { JwtPayload } from '../../auth/JwtPayload'

const logger = createLogger('auth');

let cachedCertificate: string;

// to verify JWT token signature.
// To get this URL you need to go to an Auth0 page -> Show Advanced Settings -> Endpoints -> JSON Web Key Set
const jwksUrl = process.env.JWKS_URL;

export const handler = async (
  event: CustomAuthorizerEvent
): Promise<CustomAuthorizerResult> => {
  logger.info('Authorizing a user', event.authorizationToken)
  try {
    const jwtToken = await verifyToken(event.authorizationToken)
    logger.info('User was authorized', jwtToken)

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

async function verifyToken(authHeader: string): Promise<JwtPayload> {
  const token = getToken(authHeader);
  const cert = await getCertificate();

  logger.info(`Verifying token ${token}`);

  return verify(token, cert, { algorithms: ['RS256'] }) as JwtPayload;
  
}

async function getCertificate(): Promise<string> {
  if (cachedCertificate) return cachedCertificate

  logger.info(`Fetching certificate from ${jwksUrl}`)

  const response = await Axios.get(jwksUrl)
  const keys = response.data.keys

  if (!keys) {
    logger.error('No JWKS keys found');
    throw new Error('No JWKS keys found');
  }

  const signingKeys = keys.filter(
    key => key.use === 'sig'
           && key.kty === 'RSA'
           && key.alg === 'RS256'
           && key.n
           && key.e
           && key.kid
           && (key.x5c && key.x5c.length)
  );

  if (!signingKeys.length) {
    logger.error('No JWKS signing keys found');
    throw new Error('No JWKS signing keys found');
  }
  
  const key = signingKeys[0];
  const pub = key.x5c[0];

  cachedCertificate = certToPEM(pub);

  logger.info('Valid certificate found', cachedCertificate);

  return cachedCertificate;
}

function getToken(authHeader: string): string {
  if (!authHeader) throw new Error('No authentication header');

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    logger.error('Invalid authentication header');
    throw new Error('Invalid authentication header');
  }

  const split = authHeader.split(' ');
  const token = split[1];

  return token;
}

function certToPEM(cert: string): string {
  cert = cert.match(/.{1,64}/g).join('\n');
  cert = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----\n`;
  return cert;
}
