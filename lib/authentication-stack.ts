import { Stack, Construct, Duration } from '@aws-cdk/core'
import * as cognito from '@aws-cdk/aws-cognito'
import { IEnvProps } from './shared/IEnvProps'
import { IsProd } from './shared/Environment'
import { AccountRecovery, UserPoolClientIdentityProvider } from '@aws-cdk/aws-cognito'

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
        environment: `${props.envName}`
      }
    })

    // Cognito
    this.userPool = new cognito.UserPool(this, `${props.appName}-${props.envName}-userpool`, {
      userPoolName: `${props.appName}-${props.envName}-userpool`,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      accountRecovery: AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      userInvitation: {
        emailSubject: `Invite to join our ${props.fullname}!`,
        emailBody: `Hello {username}, you have been invited to join our ${props.fullname}! Your temporary password is {####}`,
        smsMessage: `Hello {username}, you have been invited to join our ${props.fullname}! Your temporary password is {####}`
      },
      signInAliases: {
        username: true,
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
      // "Cognito recommends that email and phone number be automatically verified, if they are one of the sign in methods for the user pool.
      // The CDK does this by default, when email and/or phone number are specified as part of signInAliases"
      userVerification: {
        emailSubject: `Verify your email for ${props.fullname} app!`,
        emailBody: `Hello {username}, Thanks for signing up to our ${props.fullname} app! Your verification code is {####}`,
        emailStyle: cognito.VerificationEmailStyle.CODE,
        smsMessage: `Hello {username}, Thanks for signing up to our ${props.fullname} app! Your verification code is {####}`
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(7)
      },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true
      }
      // TODO set emails: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cognito-readme.html#emails and use AWS SES: https://github.com/aws/aws-cdk/issues/6768
      /* emailSettings: {
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

    // Google is not supported at Identity Provider in AWS CDK (https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cognito-readme.html#identity-providers)
    // by a High level constructor (https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html#module-contents) so
    // a Cloud Formation Resource (Cfn) is the best way to setup
    // Example: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-userpoolidentityprovider.html#aws-resource-cognito-userpoolidentityprovider--examples
    const googleSecretsArn = this.node.tryGetContext(`${props.account}:${props.envName}:secret:google-arn`)
    const cfnGoogleProvider = new cognito.CfnUserPoolIdentityProvider(this, `${props.appName}-${props.envName}-userpool-identityprovider-google`, {
      providerName: 'Google',
      providerType: 'Google',
      userPoolId: this.userPool.userPoolId,
      attributeMapping: {
        // custom user pool attributes go here
        // https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-specifying-attribute-mapping.html
        username: 'sub',
        email: 'email',
        email_verified: 'email_verified',
        name: 'name'
      },
      providerDetails: {
        // From https://docs.aws.amazon.com/cdk/api/latest/docs/aws-secretsmanager-readme.html#create-a-new-secret-in-a-stack
        // "SecretsManager secret values can only be used in select set of properties. For the list of properties, see the CloudFormation Dynamic References documentation."
        // SO I had to use https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references.html
        client_id: `{{resolve:secretsmanager:${googleSecretsArn}:SecretString:google-client-id}}`,
        client_secret: `{{resolve:secretsmanager:${googleSecretsArn}:SecretString:google-client-secret}}`,
        authorize_scopes: 'profile email openid'
      }
    })

    // Get the AWS CloudFormation resource
    // https://docs.aws.amazon.com/cdk/latest/guide/cfn_layer.html#cfn_layer_resource
    /* const cfnUserPool = this.userPool.node.defaultChild as cognito.CfnUserPool;

    // Change its properties
    cfnUserPool.deviceConfiguration = {
      deviceOnlyRememberedOnUserPrompt: true
    } */

    // In client apps (web or mobile), we want to enable client side flows:
    // https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-client-side-authentication-flow
    const webCallbackUrls = this.node.tryGetContext(`${props.account}:${props.envName}:userpool:webclient:callbackUrls`)
    const webLogoutUrls = this.node.tryGetContext(`${props.account}:${props.envName}:userpool:webclient:logoutUrls`)
    const webClient = this.userPool.addClient(`${props.appName}-${props.envName}-userpool-web`, {
      userPoolClientName: `${props.appName}-${props.envName}-userpool-web`,
      authFlows: {
        // userSrp is the default auth flow on amplify: https://docs.amplify.aws/lib/auth/switch-auth/q/platform/js
        userSrp: true
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true
        },
        scopes: [cognito.OAuthScope.OPENID],
        callbackUrls: webCallbackUrls.split(','),
        logoutUrls: webLogoutUrls.split(',')
      },
      preventUserExistenceErrors: true
    })

    // Get the AWS CloudFormation resource
    // https://docs.aws.amazon.com/cdk/latest/guide/cfn_layer.html#cfn_layer_resource
    const cfnUserPoolWebClient = webClient.node.defaultChild as cognito.CfnUserPoolClient
    // Change its properties
    cfnUserPoolWebClient.supportedIdentityProviders = [
      UserPoolClientIdentityProvider.COGNITO.name,
      'Google'
    ]
    cfnUserPoolWebClient.addDependsOn(cfnGoogleProvider)

    // setup based on https://snevsky.com/blog/dotnet-core-authentication-aws-cognito
    this.apiClient = this.userPool.addClient(`${props.appName}-${props.envName}-userpool-api`, {
      userPoolClientName: `${props.appName}-${props.envName}-userpool-api`,
      authFlows: {
        userPassword: !IsProd(props)
      },
      preventUserExistenceErrors: true
    })

    // In case I use OAuth2 (ex: Sign-in Through a Third Party)
    // I need to add a domain and redirect uri
    // https://aws.amazon.com/blogs/mobile/understanding-amazon-cognito-user-pool-oauth-2-0-grants/
    // https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html
    // https://docs.amplify.aws/lib/auth/social/q/platform/js#full-samples
    this.userPool.addDomain(`${props.appName}-${props.envName}-userpool-domain-prefix`, {
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
    new cognito.CfnUserPoolGroup(this, `${props.appName}-${props.envName}-userpool-group-administrator`, {
      userPoolId: this.userPool.userPoolId,
      groupName: 'administrator',
      description: 'Has access to the the Admin section of the app where they will manage users, facilities, view the schedule, and view reports.',
      precedence: 10
    })
  }
}
