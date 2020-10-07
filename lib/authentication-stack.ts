import { Stack, Construct, Duration } from '@aws-cdk/core'
import * as cognito from '@aws-cdk/aws-cognito'
import { IEnvProps } from './shared/IEnvProps'
import { IsProd } from './shared/Environment'

export class AuthenticationStack extends Stack {
  public readonly userPool: cognito.IUserPool
  public readonly apiClient: cognito.IUserPoolClient

  constructor (scope: Construct, id: string, props: IEnvProps) {
    super(scope, id, {
      env: {
        account: props.account,
        region: props.region
      },
      terminationProtection: props && IsProd(props),
      tags: {
        environment: props.envName
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

    if (IsProd(props)) {
      // eslint-disable-next-line no-new
      new cognito.CfnUserPoolRiskConfigurationAttachment(this, `${props.appName}-${props.envName}-userpool-advanced-security`, {
        clientId: 'ALL',
        userPoolId: this.userPool.userPoolId,
        compromisedCredentialsRiskConfiguration: {
          actions: {
            eventAction: 'BLOCK'
          }
        }
      })
    }

    // Get the AWS CloudFormation resource
    // https://docs.aws.amazon.com/cdk/latest/guide/cfn_layer.html#cfn_layer_resource
    /* const cfnUserPool = this.userPool.node.defaultChild as cognito.CfnUserPool;

    // Change its properties
    cfnUserPool.deviceConfiguration = {
      deviceOnlyRememberedOnUserPrompt: true
    } */

    // In client apps (web or mobile), we want to enable client side flows:
    // https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-client-side-authentication-flow
    // const webCallbackUrl = 'http://localhost:3000/home'
    this.userPool.addClient(`${props.appName}-${props.envName}-userpool-web`, {
      userPoolClientName: `${props.appName}-${props.envName}-userpool-web`,
      authFlows: {
        // userSrp is the default auth flow on amplify: https://docs.amplify.aws/lib/auth/switch-auth/q/platform/js
        userSrp: true
      },
      /* oAuth: {
        flows: {
          authorizationCodeGrant: true
        },
        scopes: [cognito.OAuthScope.OPENID],
        callbackUrls: [
          webCallbackUrl
        ]
      }, */
      preventUserExistenceErrors: true
    })

    this.userPool.addClient(`${props.appName}-${props.envName}-userpool-mobile`, {
      userPoolClientName: `${props.appName}-${props.envName}-userpool-mobile`,
      authFlows: {
        userSrp: true
      },
      preventUserExistenceErrors: true
    })

    // setup based on https://snevsky.com/blog/dotnet-core-authentication-aws-cognito
    this.apiClient = this.userPool.addClient(`${props.appName}-${props.envName}-userpool-api`, {
      userPoolClientName: `${props.appName}-${props.envName}-userpool-api`
    })

    // In case I use OAuth2, I need to add a domain and redirect uri
    // https://aws.amazon.com/blogs/mobile/understanding-amazon-cognito-user-pool-oauth-2-0-grants/
    // https://docs.amplify.aws/lib/auth/social/q/platform/js#full-samples
    /* const domain = this.userPool.addDomain(`${props.appName}-${props.envName}-userpool-domain-prefix`, {
      cognitoDomain: {
        domainPrefix: `${props.appName}-${props.envName}`
      }
    }) */

    // TODO use a certificate for production
    // https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cognito-readme.html#domains
    /* const domainCert = new acm.Certificate.fromCertificateArn(this, 'domainCert', certificateArn)
    const domain = pool.addDomain('CustomDomain', {
      customDomain: {
        domainName: 'user.myapp.com',
        certificate: domainCert,
      },
    }) */

    /* domain.signInUrl(webclient, {
      redirectUri: webCallbackUrl // must be a URL configured under 'callbackUrls' with the client
    })

    domain.signInUrl(mobileClient, {
      redirectUri: mobileCallbackUrl // must be a URL configured under 'callbackUrls' with the client
    }) */

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

    // eslint-disable-next-line no-new
    new cognito.CfnUserPoolGroup(this, `${props.appName}-${props.envName}-userpool-group-system-administrators`, {
      userPoolId: this.userPool.userPoolId,
      groupName: 'system_administrators',
      description: 'This user type manages the Organizations/Systems and User base.',
      precedence: 10
    })
  }
}
