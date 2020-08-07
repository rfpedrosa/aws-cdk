import { Stack, Construct, Duration } from '@aws-cdk/core'
import * as cognito from '@aws-cdk/aws-cognito'
import { IEnvProps } from './shared/IEnvProps'

export class AuthenticationStack extends Stack {
  public readonly userPool: cognito.IUserPool
  public readonly apiClient: cognito.IUserPoolClient

  constructor (scope: Construct, id: string, props: IEnvProps) {
    super(scope, id, {
      env: {
        account: props.account,
        region: props.region
      },
      terminationProtection: props && props.envName === 'prod',
      tags: {
        environment: `${props.envName}`
      }
    })

    // Cognito
    this.userPool = new cognito.UserPool(this, `${props.appName}-${props.envName}-userpool`, {
      userPoolName: `${props.appName}-${props.envName}-userpool`,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      userVerification: {
        emailSubject: `Verify your email for${props.appName} app!`,
        emailBody: `Hello {username}, Thanks for signing up to our ${props.appName} app! Your verification code is {####}`,
        emailStyle: cognito.VerificationEmailStyle.CODE,
        smsMessage: `Hello {username}, Thanks for signing up to our ${props.appName} app! Your verification code is {####}`
      },
      userInvitation: {
        emailSubject: `Invite to join our ${props.appName} app!`,
        emailBody: `Hello {username}, you have been invited to join our ${props.appName} app! Your temporary password is {####}`,
        smsMessage: `Hello {username}, Your temporary password for our ${props.appName} app is {####}`
      },
      signInAliases: {
        phone: true,
        email: true
      },
      standardAttributes: {
        fullname: {
          required: true,
          mutable: false
        }
      },
      customAttributes: {
        organization_id: new cognito.StringAttribute({ minLen: 1, maxLen: 150, mutable: false })
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(3)
      },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true
      }
      // TODO set emails: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cognito-readme.html#emails and use AWS SES: https://github.com/aws/aws-cdk/issues/6768
      /* emailTransmission: {
        from: 'noreply@myawesomeapp.com',
        replyTo: 'support@myawesomeapp.com',
      }, */
    })

    const webclient = this.userPool.addClient(`${props.appName}-${props.envName}-userpool-web`, {
      userPoolClientName: `${props.appName}-${props.envName}-userpool-web`,
      oAuth: {
        flows: {
          authorizationCodeGrant: true
        },
        scopes: [cognito.OAuthScope.OPENID],
        callbackUrls: [
          'http://localhost:3000/home'
        ]
      }
      // preventUserExistenceErrors: true, // TODO: ENABLE this for production environment
    })

    // settings based on https://snevsky.com/blog/dotnet-core-authentication-aws-cognito
    this.apiClient = this.userPool.addClient(`${props.appName}-${props.envName}-userpool-api`, {
      userPoolClientName: `${props.appName}-${props.envName}-userpool-api`,
      authFlows: {
        userSrp: true,
        refreshToken: true
      }
      // preventUserExistenceErrors: true, // TODO: ENABLE this for production environment
    })

    // eslint-disable-next-line no-new
    new cognito.CfnUserPoolResourceServer(this, `${props.appName}-${props.envName}-userpool-resource-server`, {
      identifier: `${props.appName}-${props.envName}-userpool-resource-server`,
      name: `${props.appName}-${props.envName}-userpool-resource-server`,
      userPoolId: this.userPool.userPoolId,
      scopes: [
        {
          scopeName: 'read:users',
          scopeDescription: 'access to all users'
        }
      ]
    })

    const domain = this.userPool.addDomain(`${props.appName}-${props.envName}-userpool-domain-prefix`, {
      cognitoDomain: {
        domainPrefix: `${props.appName}-${props.envName}`
      }
    })

    // TODO use a certificate for production
    // https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cognito-readme.html#domains
    /* const domainCert = new acm.Certificate.fromCertificateArn(this, 'domainCert', certificateArn)
    const domain = pool.addDomain('CustomDomain', {
      customDomain: {
        domainName: 'user.myapp.com',
        certificate: domainCert,
      },
    }) */

    domain.signInUrl(webclient, {
      redirectUri: 'http://localhost:3000/home' // must be a URL configured under 'callbackUrls' with the client
    })
  }
}
