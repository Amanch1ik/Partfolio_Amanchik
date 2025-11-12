using System.Threading.Tasks;
using System.Diagnostics;
using Google.SignIn;
using AuthenticationServices;
using Foundation;
using UIKit;

namespace YessLoyaltyApp.Services
{
    public class ExternalAuthResult
    {
        public bool IsSuccess { get; set; }
        public string Email { get; set; }
        public string Name { get; set; }
        public string Token { get; set; }
        public string ErrorMessage { get; set; }
    }

    public class ExternalAuthService
    {
        private readonly ApiService _apiService;
        private readonly INavigationService _navigationService;

        public ExternalAuthService(
            ApiService apiService, 
            INavigationService navigationService)
        {
            _apiService = apiService;
            _navigationService = navigationService;
        }

        public async Task<ExternalAuthResult> SignInWithGoogleAsync()
        {
            try 
            {
                // Настройка Google Sign-In
                var configuration = new GIDConfiguration(
                    clientID: "YOUR_GOOGLE_CLIENT_ID", 
                    serverClientID: "YOUR_SERVER_CLIENT_ID"
                );

                var presentingViewController = GetTopViewController();
                
                var result = await GIDSignIn.SharedInstance.SignInAsync(
                    configuration, 
                    presentingViewController
                );

                if (result != null)
                {
                    var user = result.User;
                    var idToken = result.Authentication.IdToken;

                    // Отправка токена на бэкенд
                    var backendResponse = await _apiService.GoogleLoginAsync(idToken);

                    if (backendResponse.IsSuccess)
                    {
                        // Сохраняем токен
                        _apiService.SetAuthToken(backendResponse.Data.AccessToken);

                        return new ExternalAuthResult
                        {
                            IsSuccess = true,
                            Email = user.Profile.Email,
                            Name = user.Profile.Name,
                            Token = idToken
                        };
                    }
                    else
                    {
                        return new ExternalAuthResult
                        {
                            IsSuccess = false,
                            ErrorMessage = backendResponse.ErrorMessage
                        };
                    }
                }
                
                return new ExternalAuthResult
                {
                    IsSuccess = false,
                    ErrorMessage = "Google Sign-In failed"
                };
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Google Sign-In Error: {ex.Message}");
                return new ExternalAuthResult
                {
                    IsSuccess = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<ExternalAuthResult> SignInWithAppleAsync()
        {
            if (!OperatingSystem.IsIOSVersionAtLeast(13))
            {
                return new ExternalAuthResult
                {
                    IsSuccess = false,
                    ErrorMessage = "Sign in with Apple is only supported on iOS 13+"
                };
            }

            try 
            {
                var appleIdProvider = new ASAuthorizationAppleIdProvider();
                var request = appleIdProvider.CreateRequest();
                request.RequestedScopes = new[] 
                { 
                    ASAuthorizationScope.FullName, 
                    ASAuthorizationScope.Email 
                };

                var authorizationController = new ASAuthorizationController(new[] { request });
                var delegateHandler = new AppleSignInDelegate();
                authorizationController.Delegate = delegateHandler;

                var presentingViewController = GetTopViewController();
                authorizationController.PresentationContextProvider = presentingViewController as IASAuthorizationControllerPresentationContextProviding;
                authorizationController.PerformRequests();

                var result = await delegateHandler.GetTaskCompletionSource().Task;

                if (result.IsSuccess)
                {
                    var credential = result.Credential as ASAuthorizationAppleIdCredential;
                    var identityToken = NSString.FromData(credential.IdentityToken, NSStringEncoding.UTF8);

                    // Отправка токена на бэкенд
                    var backendResponse = await _apiService.AppleLoginAsync(identityToken.ToString());

                    if (backendResponse.IsSuccess)
                    {
                        // Сохраняем токен
                        _apiService.SetAuthToken(backendResponse.Data.AccessToken);

                        return new ExternalAuthResult
                        {
                            IsSuccess = true,
                            Email = credential.Email,
                            Name = $"{credential.FullName.GivenName} {credential.FullName.FamilyName}",
                            Token = identityToken.ToString()
                        };
                    }
                    else
                    {
                        return new ExternalAuthResult
                        {
                            IsSuccess = false,
                            ErrorMessage = backendResponse.ErrorMessage
                        };
                    }
                }

                return new ExternalAuthResult
                {
                    IsSuccess = false,
                    ErrorMessage = "Apple Sign-In failed"
                };
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Apple Sign-In Error: {ex.Message}");
                return new ExternalAuthResult
                {
                    IsSuccess = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        private UIViewController GetTopViewController()
        {
            var rootViewController = UIApplication.SharedApplication.KeyWindow.RootViewController;
            
            while (rootViewController.PresentedViewController != null)
            {
                rootViewController = rootViewController.PresentedViewController;
            }

            return rootViewController;
        }
    }

    // Делегат для обработки входа через Apple
    public class AppleSignInDelegate : ASAuthorizationControllerDelegate
    {
        private TaskCompletionSource<ExternalAuthResult> _taskCompletionSource;

        public AppleSignInDelegate()
        {
            _taskCompletionSource = new TaskCompletionSource<ExternalAuthResult>();
        }

        public TaskCompletionSource<ExternalAuthResult> GetTaskCompletionSource() => _taskCompletionSource;

        public override void DidCompleteAuthorization(ASAuthorizationController controller, ASAuthorization authorization)
        {
            var credential = authorization.Credential as ASAuthorizationAppleIdCredential;
            
            if (credential != null)
            {
                _taskCompletionSource.SetResult(new ExternalAuthResult
                {
                    IsSuccess = true,
                    Email = credential.Email,
                    Name = $"{credential.FullName.GivenName} {credential.FullName.FamilyName}"
                });
            }
            else
            {
                _taskCompletionSource.SetResult(new ExternalAuthResult
                {
                    IsSuccess = false,
                    ErrorMessage = "No credential received"
                });
            }
        }

        public override void DidCompleteWithError(ASAuthorizationController controller, NSError error)
        {
            _taskCompletionSource.SetResult(new ExternalAuthResult
            {
                IsSuccess = false,
                ErrorMessage = error.LocalizedDescription
            });
        }
    }
}
