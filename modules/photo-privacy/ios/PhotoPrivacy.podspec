Pod::Spec.new do |s|
  s.name = 'PhotoPrivacy'
  s.version = '1.0.0'
  s.summary = 'On-device photo cropping and privacy checks'
  s.description = s.summary
  s.author = 'Verinaliz'
  s.license = 'MIT'
  s.homepage = 'https://expo.dev/modules'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/expo/expo.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'UIKit'
  s.source_files = '**/*.swift'
end
